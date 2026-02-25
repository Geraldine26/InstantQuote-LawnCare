"use client";

import { createContext, useCallback, useContext } from "react";

import type { TenantConfig } from "@/src/lib/tenant";

interface TenantContextValue {
  tenant: TenantConfig;
  tenantSlug: string | null;
  routePrefix: string;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  tenant: TenantConfig;
  tenantSlug: string | null;
  children: React.ReactNode;
}

export function TenantProvider({ tenant, tenantSlug, children }: TenantProviderProps) {
  const routePrefix = tenantSlug ? `/t/${tenantSlug}` : "";

  return <TenantContext.Provider value={{ tenant, tenantSlug, routePrefix }}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantConfig {
  const value = useContext(TenantContext);

  if (!value) {
    throw new Error("useTenant must be used within TenantProvider");
  }

  return value.tenant;
}

export function useTenantRouting() {
  const value = useContext(TenantContext);

  if (!value) {
    throw new Error("useTenantRouting must be used within TenantProvider");
  }

  const withTenantPath = useCallback(
    (path: string) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;

      if (!value.routePrefix) {
        return normalizedPath;
      }

      if (normalizedPath === "/") {
        return value.routePrefix;
      }

      return `${value.routePrefix}${normalizedPath}`;
    },
    [value.routePrefix],
  );

  return {
    tenantSlug: value.tenantSlug,
    routePrefix: value.routePrefix,
    withTenantPath,
  };
}
