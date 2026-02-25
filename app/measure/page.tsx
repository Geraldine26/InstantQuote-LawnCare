"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { MapDrawer } from "@/components/MapDrawer";
import { QUOTE_SESSION_KEYS } from "@/lib/quoteSession";
import { calculateQuote, formatCurrency } from "@/lib/pricing";
import { useQuoteStore } from "@/store/quoteStore";
import { useTenantRouting } from "@/src/components/TenantProvider";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

export default function MeasurePage() {
  const router = useRouter();
  const { withTenantPath } = useTenantRouting();
  const { address, center, polygons, sqft, selectedServices, mowingFrequency, setSqft, setPolygons } = useQuoteStore((state) => ({
    address: state.address,
    center: state.center,
    polygons: state.polygons,
    sqft: state.sqft,
    selectedServices: state.selectedServices,
    mowingFrequency: state.mowingFrequency,
    setSqft: state.setSqft,
    setPolygons: state.setPolygons,
  }));

  useEffect(() => {
    if (!address) {
      router.replace(withTenantPath("/"));
    }
  }, [address, router, withTenantPath]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextSqft = polygons.length > 0 ? Math.max(0, Math.round(sqft)) : 0;
    sessionStorage.setItem(QUOTE_SESSION_KEYS.totalSqft, String(nextSqft));
  }, [polygons.length, sqft]);

  if (!address) {
    return null;
  }

  const effectiveSqft = polygons.length > 0 ? Math.max(0, Math.round(sqft)) : 0;

  const handleGetPriceNow = () => {
    const quote = calculateQuote(effectiveSqft, selectedServices, mowingFrequency);

    const details = quote.lineItems
      .map((item) => (item.frequency ? `${item.label} (${item.frequency === "weekly" ? "Weekly" : "Biweekly"})` : item.label))
      .join(", ");

    const finalQuote = {
      details,
      total: formatCurrency(quote.total),
      address,
      area: `${new Intl.NumberFormat("en-US").format(effectiveSqft)} sqft`,
      date: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem(QUOTE_SESSION_KEYS.totalSqft, String(effectiveSqft));
      sessionStorage.setItem(QUOTE_SESSION_KEYS.finalQuote, JSON.stringify(finalQuote));
    }

    router.push(withTenantPath("/services"));
  };

  const handleStartOver = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(QUOTE_SESSION_KEYS.totalSqft, "0");
      sessionStorage.removeItem(QUOTE_SESSION_KEYS.finalQuote);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark">Step 2 of 4</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Measure your lawn area</h1>
      </header>

      <MapDrawer
        key={normalizeAddress(address)}
        address={address}
        initialCenter={center}
        initialPolygons={polygons}
        initialSqft={effectiveSqft}
        onAreaChange={setSqft}
        onPolygonsChange={setPolygons}
        onGetPriceNow={handleGetPriceNow}
        onStartOver={handleStartOver}
      />
    </main>
  );
}
