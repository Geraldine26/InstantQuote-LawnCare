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

const demoTenant: TenantConfig = {
  slug: "demo",
  brandName: "Instant Lawn Quote",
  tagline: "Get an exact lawn care price in minutes.",
  primaryHex: "#16a34a",
  bgTintHex: "#eafaf1",
  ownerEmail: "[[OWNER_EMAIL]]",
  supportPhone: "+18016516326",
  allowedDomains: ["http://localhost:3000", "http://127.0.0.1:3000"],
};

export const TENANT_HOST_MAP: Record<string, TenantConfig> = {
  localhost: demoTenant,
  "127.0.0.1": demoTenant,
  "demo.instant-quote.online": {
    ...demoTenant,
    allowedDomains: [
      "https://demo.instant-quote.online",
      "https://www.demo.instant-quote.online",
      "https://example-wordpress-site.com",
    ],
  },
};

export const DEMO_TENANT = demoTenant;
