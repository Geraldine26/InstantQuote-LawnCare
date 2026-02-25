export const SERVICE_KEYS = ["mowing", "aeration", "powerRake", "seed", "fertWeed"] as const;

export type ServiceKey = (typeof SERVICE_KEYS)[number];
export type MowingFrequency = "weekly" | "biweekly";

export interface PricingTier {
  min: number;
  max: number;
  mowingWeekly: number;
  mowingBiweekly: number;
  aeration: number;
  powerRake: number;
  fertWeed: number;
  seed: number;
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
  seed: "Overseeding",
  fertWeed: "Fertilizer & Weed Control",
};

export const SERVICE_DESCRIPTIONS: Record<ServiceKey, string> = {
  mowing: "Routine mowing for a clean and healthy lawn.",
  aeration: "Core aeration to improve water and nutrient flow.",
  powerRake: "Power raking to remove dead turf and loosen thatch.",
  seed: "Overseeding for thicker, healthier turf coverage.",
  fertWeed: "Seasonal fertilization plus broadleaf weed control.",
};
