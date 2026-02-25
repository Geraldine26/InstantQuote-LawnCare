export const SERVICE_KEYS = ["mowing", "aeration", "powerRake", "fertilizing"] as const;

export type ServiceKey = (typeof SERVICE_KEYS)[number];
export type MowingFrequency = "weekly" | "biweekly";

export interface PricingTier {
  min: number;
  max: number;
  mowingWeekly: number;
  mowingBiweekly: number;
  aeration: number;
  powerRake: number;
  fertilizing: number;
}

export interface QuoteLineItem {
  key: ServiceKey;
  label: string;
  price: number;
  frequency?: MowingFrequency;
}

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  mowing: "Mowing",
  aeration: "Aeration",
  powerRake: "Dethatching",
  fertilizing: "Fertilizing",
};

export const SERVICE_DESCRIPTIONS: Record<ServiceKey, string> = {
  mowing: "Routine mowing for a clean and healthy lawn.",
  aeration: "Core aeration to improve water and nutrient flow.",
  powerRake: "Power raking to remove dead turf and loosen thatch.",
  fertilizing: "Seasonal fertilization to improve lawn health and growth.",
};
