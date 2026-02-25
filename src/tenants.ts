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

const defaultOwnerEmail = process.env.OWNER_EMAIL ?? "[[OWNER_EMAIL]]";
const defaultPushoverBcc = process.env.PUSHOVER_BCC_EMAIL;

export const TENANT_SLUG_MAP: Record<string, TenantConfig> = {
  demo: {
    slug: "demo",
    brandName: "Green Lawn Utah",
    tagline: "Get an exact lawn care price in minutes.",
    primaryHex: "#FF7A00",
    bgTintHex: "#eafaf1",
    ownerEmail: defaultOwnerEmail,
    ...(defaultPushoverBcc ? { pushoverBcc: defaultPushoverBcc } : {}),
    supportPhone: "+18016516326",
    allowedDomains: ["http://localhost:3000", "http://127.0.0.1:3000"],
  },
  "instant-quote-vercel": {
    slug: "instant-quote-vercel",
    brandName: "Green Lawn Utah",
    tagline: "Fast lawn pricing in minutes.",
    primaryHex: "#FF7A00",
    bgTintHex: "#ecfeff",
    ownerEmail: defaultOwnerEmail,
    ...(defaultPushoverBcc ? { pushoverBcc: defaultPushoverBcc } : {}),
    supportPhone: "+18016516326",
    allowedDomains: ["https://instant-quote-lawn-care.vercel.app"],
  },
  // Ejemplo para múltiples clientes en el mismo dominio usando /t/{slug}
  // Configura ownerEmail y pushoverBcc por tenant cuando lo actives.
  acme: {
    slug: "acme",
    brandName: "Acme Lawn Care",
    tagline: "Instant quotes for Acme customers.",
    primaryHex: "#0f766e",
    bgTintHex: "#ecfeff",
    ownerEmail: process.env.ACME_OWNER_EMAIL ?? defaultOwnerEmail,
    ...(process.env.ACME_PUSHOVER_BCC_EMAIL
      ? { pushoverBcc: process.env.ACME_PUSHOVER_BCC_EMAIL }
      : defaultPushoverBcc
        ? { pushoverBcc: defaultPushoverBcc }
        : {}),
    supportPhone: "+18016516326",
    allowedDomains: ["https://www.acme.com"],
  },
};

export const TENANT_HOST_MAP: Record<string, TenantConfig> = {
  localhost: TENANT_SLUG_MAP.demo,
  "127.0.0.1": TENANT_SLUG_MAP.demo,
  "demo.instant-quote.online": TENANT_SLUG_MAP.demo,
  "instant-quote-lawn-care.vercel.app": TENANT_SLUG_MAP["instant-quote-vercel"],
};

export const DEMO_TENANT = TENANT_SLUG_MAP.demo;
