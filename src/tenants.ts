export interface TenantConfig {
  slug: string;
  brandName: string;
  tagline?: string;
  logoUrl?: string;
  primaryHex: string;
  bgTintHex: string;
  ownerEmail: string;
  pushoverBcc?: string;
  supportPhone?: string;
  allowedDomains: string[];
}

const vercelAppOrigin = "https://instant-quote-lawn-care.vercel.app";

export const TENANT_SLUG_MAP: Record<string, TenantConfig> = {
  demo: {
    slug: "demo",
    brandName: "Instant Quote Demo",
    tagline: "Get an exact lawn care price in minutes.",
    primaryHex: "#16a34a",
    bgTintHex: "#eafaf1",
    ownerEmail: "demo-owner@example.com",
    pushoverBcc: "demo-pushover@example.com",
    supportPhone: "+18016516326",
    allowedDomains: ["http://localhost:3000", "http://127.0.0.1:3000"],
  },
  greenlawn: {
    slug: "greenlawn",
    brandName: "Green Lawn Utah",
    tagline: "Fast lawn pricing in minutes.",
    primaryHex: "#16a34a",
    bgTintHex: "#ecfeff",
    ownerEmail: "greenlawn-owner@example.com",
    pushoverBcc: "greenlawn-pushover@example.com",
    supportPhone: "+18016516326",
    allowedDomains: [vercelAppOrigin, "https://greenlawnutah.com", "https://www.greenlawnutah.com"],
  },
  acme: {
    slug: "acme",
    brandName: "Acme Lawn Care",
    tagline: "Neighborhood lawn service made simple.",
    primaryHex: "#ea580c",
    bgTintHex: "#fff7ed",
    ownerEmail: "acme-owner@example.com",
    pushoverBcc: "acme-pushover@example.com",
    supportPhone: "+18016516326",
    allowedDomains: [vercelAppOrigin, "https://acmelawncare.com", "https://www.acmelawncare.com"],
  },
  servcrops: {
    slug: "servcrops",
    brandName: "ServCrops Turf",
    tagline: "Precision treatments for stronger turf.",
    primaryHex: "#0f766e",
    bgTintHex: "#ecfeff",
    ownerEmail: "servcrops-owner@example.com",
    pushoverBcc: "servcrops-pushover@example.com",
    supportPhone: "+18016516326",
    allowedDomains: [vercelAppOrigin, "https://servcrops.com", "https://www.servcrops.com"],
  },
};

export const TENANT_HOST_MAP: Record<string, TenantConfig> = {
  localhost: TENANT_SLUG_MAP.demo,
  "127.0.0.1": TENANT_SLUG_MAP.demo,
  "demo.instant-quote.online": TENANT_SLUG_MAP.demo,
  "instant-quote-lawn-care.vercel.app": TENANT_SLUG_MAP.greenlawn,
};

export const DEMO_TENANT = TENANT_SLUG_MAP.demo;
