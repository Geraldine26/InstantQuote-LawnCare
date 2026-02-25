import type { Metadata } from "next";
import { headers } from "next/headers";
import type { CSSProperties } from "react";

import "@/app/globals.css";
import { TenantProvider } from "@/src/components/TenantProvider";
import { getRequestHost, hexToRgbCss, resolveTenant, resolveTenantFromSlug } from "@/src/lib/tenant";

export const metadata: Metadata = {
  title: "Instant Lawn Quote",
  description: "Multi-step instant quote flow for lawn care services.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = headers();
  const host = getRequestHost(requestHeaders);
  const tenantSlugHeader = requestHeaders.get("x-tenant-slug");
  const tenant = resolveTenant({ host, slug: tenantSlugHeader });
  const tenantSlug = tenantSlugHeader && resolveTenantFromSlug(tenantSlugHeader) ? tenant.slug : null;

  // Variables CSS dinámicas por tenant para mantener el mismo layout.
  const cssVariables = {
    "--brand": tenant.primaryHex,
    "--brandBg": tenant.bgTintHex,
    "--brand-rgb": hexToRgbCss(tenant.primaryHex),
  } as CSSProperties;

  return (
    <html lang="en">
      <body style={cssVariables}>
        <TenantProvider tenant={tenant} tenantSlug={tenantSlug}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
