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

const demoTenant: TenantConfig = {
  slug: "demo",
  brandName: "Instant Lawn Quote",
  tagline: "Get an exact lawn care price in minutes.",
  primaryHex: "#16a34a",
  bgTintHex: "#eafaf1",
  ownerEmail: defaultOwnerEmail,
  ...(defaultPushoverBcc ? { pushoverBcc: defaultPushoverBcc } : {}),
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
  "instant-quote-lawn-care.vercel.app": {
    ...demoTenant,
    slug: "instant-quote-vercel",
    brandName: "Green Lawn Utah",
    tagline: "Fast lawn pricing in minutes.",
    primaryHex: "#FF7A00",
    bgTintHex: "#ecfeff",
    allowedDomains: ["https://instant-quote-lawn-care.vercel.app"],
  },
  "tu-proyecto.vercel.app": {
    ...demoTenant,
    slug: "prod",
    brandName: "Tu Marca",
    tagline: "Tu tagline real",
    primaryHex: "#0f766e",
    bgTintHex: "#ecfeff",
    ownerEmail: "tu-correo@dominio.com",
    supportPhone: "+18016516326",
    allowedDomains: ["https://tu-proyecto.vercel.app"], // temporal mientras no haya WP/dominio
  },
};

export const DEMO_TENANT = demoTenant;
