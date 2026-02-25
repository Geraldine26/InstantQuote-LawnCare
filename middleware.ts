import { NextRequest, NextResponse } from "next/server";

import {
  extractTenantSlugFromPath,
  getAllowedOrigins,
  getRequestHost,
  resolveTenant,
  resolveTenantFromSlug,
  stripTenantPrefix,
} from "@/src/lib/tenant";

export function middleware(request: NextRequest) {
  const host = getRequestHost(request.headers);
  const tenantSlugFromPath = extractTenantSlugFromPath(request.nextUrl.pathname);
  const resolvedSlugTenant = tenantSlugFromPath ? resolveTenantFromSlug(tenantSlugFromPath) : null;
  const tenant = resolveTenant({ host, slug: tenantSlugFromPath });

  if (tenantSlugFromPath && !resolvedSlugTenant) {
    return new NextResponse("Tenant not found", { status: 404 });
  }

  const requestHeaders = new Headers(request.headers);

  if (tenantSlugFromPath && resolvedSlugTenant) {
    requestHeaders.set("x-tenant-slug", tenant.slug);
  } else {
    requestHeaders.delete("x-tenant-slug");
  }

  requestHeaders.set("x-tenant-host", host);

  const isTenantPrefixedPath = Boolean(tenantSlugFromPath);

  const response = isTenantPrefixedPath
    ? NextResponse.rewrite(
        new URL(
          `${stripTenantPrefix(request.nextUrl.pathname)}${request.nextUrl.search}`,
          request.url,
        ),
        {
          request: {
            headers: requestHeaders,
          },
        },
      )
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

  const allowedOrigins = getAllowedOrigins(tenant);
  const frameAncestors = Array.from(new Set(["'self'", ...allowedOrigins])).join(" ");

  // Se bloquea el embedding fuera de dominios permitidos por tenant.
  response.headers.set("Content-Security-Policy", `frame-ancestors ${frameAncestors};`);
  response.headers.set("Vary", "Host");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
