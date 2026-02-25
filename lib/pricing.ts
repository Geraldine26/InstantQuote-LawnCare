import { SERVICE_KEYS, SERVICE_LABELS, type MowingFrequency, type QuoteLineItem, type ServiceKey } from "@/lib/types";

const BASE_WEEKLY_MOWING = 53;
const BASE_FERTILIZING = 65;
const BASE_AERATION = 65;
const BASE_POWER_RAKE = 180;

function roundToDollar(value: number): number {
  return Math.round(value);
}

export function normalizeSqft(sqft: number): number {
  if (!Number.isFinite(sqft)) {
    return 0;
  }

  return Math.max(0, Math.round(sqft));
}

export function getExtraBlocks(sqft: number): number {
  const normalizedSqft = normalizeSqft(sqft);

  if (normalizedSqft < 4000) {
    return 0;
  }

  return Math.floor((normalizedSqft - 4000) / 500) + 1;
}

function getWeeklyMowingPrice(extraBlocks: number): number {
  return BASE_WEEKLY_MOWING + extraBlocks * 2;
}

function getBiweeklyMowingPrice(extraBlocks: number): number {
  return roundToDollar(getWeeklyMowingPrice(extraBlocks) * 1.2);
}

function getAerationPrice(extraBlocks: number): number {
  return BASE_AERATION + extraBlocks * 5;
}

function getFertilizingPrice(extraBlocks: number): number {
  return BASE_FERTILIZING + extraBlocks * 5;
}

function getPowerRakePrice(extraBlocks: number): number {
  if (extraBlocks === 0) {
    return BASE_POWER_RAKE;
  }

  return BASE_POWER_RAKE + 30 + (extraBlocks - 1) * 15;
}

export function getServicePrice(sqft: number, service: ServiceKey, mowingFrequency: MowingFrequency): number {
  const extraBlocks = getExtraBlocks(sqft);

  switch (service) {
    case "mowing":
      return mowingFrequency === "biweekly" ? getBiweeklyMowingPrice(extraBlocks) : getWeeklyMowingPrice(extraBlocks);
    case "aeration":
      return getAerationPrice(extraBlocks);
    case "powerRake":
      return getPowerRakePrice(extraBlocks);
    case "fertilizing":
      return getFertilizingPrice(extraBlocks);
    default:
      return 0;
  }
}

export function calculateQuote(sqft: number, selectedServices: ServiceKey[], mowingFrequency: MowingFrequency) {
  const selectedSet = new Set(selectedServices);

  const lineItems: QuoteLineItem[] = SERVICE_KEYS.filter((service) => selectedSet.has(service)).map((service) => {
    const price = getServicePrice(sqft, service, mowingFrequency);

    return {
      key: service,
      label: SERVICE_LABELS[service],
      price,
      ...(service === "mowing" ? { frequency: mowingFrequency } : {}),
    };
  });

  const total = lineItems.reduce((sum, item) => sum + item.price, 0);

  return {
    extraBlocks: getExtraBlocks(sqft),
    lineItems,
    total,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
