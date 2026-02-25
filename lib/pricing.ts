import { PRICING_TIERS } from "@/lib/tiers";
import { SERVICE_KEYS, SERVICE_LABELS, type MowingFrequency, type PricingTier, type QuoteLineItem, type ServiceKey } from "@/lib/types";

const FIRST_TIER = PRICING_TIERS[0];
const LAST_TIER = PRICING_TIERS[PRICING_TIERS.length - 1];

export function normalizeSqft(sqft: number): number {
  if (!Number.isFinite(sqft)) {
    return 0;
  }

  return Math.round(sqft);
}

export function findTier(sqft: number): PricingTier {
  const normalizedSqft = normalizeSqft(sqft);

  if (normalizedSqft <= FIRST_TIER.max) {
    return FIRST_TIER;
  }

  if (normalizedSqft >= LAST_TIER.min) {
    return LAST_TIER;
  }

  return PRICING_TIERS.find((tier) => normalizedSqft >= tier.min && normalizedSqft <= tier.max) ?? LAST_TIER;
}

export function getServicePrice(tier: PricingTier, service: ServiceKey, mowingFrequency: MowingFrequency): number {
  switch (service) {
    case "mowing":
      return mowingFrequency === "biweekly" ? tier.mowingBiweekly : tier.mowingWeekly;
    case "aeration":
      return tier.aeration;
    case "powerRake":
      return tier.powerRake;
    case "seed":
      return tier.seed;
    case "fertWeed":
      return tier.fertWeed;
    default:
      return 0;
  }
}

export function calculateQuote(sqft: number, selectedServices: ServiceKey[], mowingFrequency: MowingFrequency) {
  const tier = findTier(sqft);
  const selectedSet = new Set(selectedServices);

  const lineItems: QuoteLineItem[] = SERVICE_KEYS.filter((service) => selectedSet.has(service)).map((service) => {
    const price = getServicePrice(tier, service, mowingFrequency);

    return {
      key: service,
      label: SERVICE_LABELS[service],
      price,
      ...(service === "mowing" ? { frequency: mowingFrequency } : {}),
    };
  });

  const total = lineItems.reduce((sum, item) => sum + item.price, 0);

  return {
    tier,
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
