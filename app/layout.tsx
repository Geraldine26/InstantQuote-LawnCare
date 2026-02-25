import type { Metadata } from "next";
import { headers } from "next/headers";
import type { CSSProperties } from "react";

import "@/app/globals.css";
import { TenantProvider } from "@/src/components/TenantProvider";
import { getRequestHost, hexToRgbCss, resolveTenantFromHost } from "@/src/lib/tenant";

export const metadata: Metadata = {
  title: "Instant Lawn Quote",
  description: "Multi-step instant quote flow for lawn care services.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = headers();
  const host = getRequestHost(requestHeaders);
  const tenant = resolveTenantFromHost(host);

  // Variables CSS dinámicas por tenant para mantener el mismo layout.
  const cssVariables = {
    "--brand": tenant.primaryHex,
    "--brandBg": tenant.bgTintHex,
    "--brand-rgb": hexToRgbCss(tenant.primaryHex),
  } as CSSProperties;

  return (
    <html lang="en">
      <body style={cssVariables}>
        <TenantProvider tenant={tenant}>{children}</TenantProvider>
      </body>
    </html>
  );
}
