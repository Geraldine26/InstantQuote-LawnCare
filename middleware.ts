import { NextRequest, NextResponse } from "next/server";

import { getAllowedOrigins, getRequestHost, resolveTenantFromHost } from "@/src/lib/tenant";

export function middleware(request: NextRequest) {
  const host = getRequestHost(request.headers);
  const tenant = resolveTenantFromHost(host);

  const allowedOrigins = getAllowedOrigins(tenant);
  const frameAncestors = Array.from(new Set(["'self'", ...allowedOrigins])).join(" ");

  // Se bloquea el embedding fuera de dominios permitidos por tenant.
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", `frame-ancestors ${frameAncestors};`);
  response.headers.set("Vary", "Host");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
