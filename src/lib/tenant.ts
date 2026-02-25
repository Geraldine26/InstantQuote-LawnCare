import { DEMO_TENANT, TENANT_HOST_MAP, type TenantConfig } from "@/src/tenants";

export function stripPortFromHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveTenantFromHost(host: string): TenantConfig {
  const normalizedHost = stripPortFromHost(host);
  return TENANT_HOST_MAP[normalizedHost] ?? DEMO_TENANT;
}

export function getRequestHost(headers: Headers): string {
  return headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
}

export function hexToRgbCss(hexColor: string): string {
  const normalized = hexColor.replace("#", "").trim();
  const fullHex = normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized;

  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return "22 163 74";
  }

  return `${r} ${g} ${b}`;
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function getAllowedOrigins(tenant: TenantConfig): string[] {
  return tenant.allowedDomains.map((domain) => normalizeOrigin(domain)).filter((origin): origin is string => Boolean(origin));
}

export function isAllowedEmbedOrigin(tenant: TenantConfig, origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return false;
  }

  const allowedOrigins = getAllowedOrigins(tenant);
  return allowedOrigins.includes(normalizedOrigin);
}

export type { TenantConfig };
