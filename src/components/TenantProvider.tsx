"use client";

import { createContext, useContext } from "react";

import type { TenantConfig } from "@/src/lib/tenant";

const TenantContext = createContext<TenantConfig | null>(null);

interface TenantProviderProps {
  tenant: TenantConfig;
  children: React.ReactNode;
}

export function TenantProvider({ tenant, children }: TenantProviderProps) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantConfig {
  const value = useContext(TenantContext);

  if (!value) {
    throw new Error("useTenant must be used within TenantProvider");
  }

  return value;
}
