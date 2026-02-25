"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { MapDrawer } from "@/components/MapDrawer";
import { calculateQuote, formatCurrency } from "@/lib/pricing";
import { useQuoteStore } from "@/store/quoteStore";
import { useTenantRouting } from "@/src/components/TenantProvider";

const TOTAL_SQFT_STORAGE_KEY = "gl_quote_total_sqft";
const FINAL_QUOTE_STORAGE_KEY = "gl_final_quote";

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

    sessionStorage.setItem(TOTAL_SQFT_STORAGE_KEY, String(Math.max(0, Math.round(sqft))));
  }, [sqft]);

  if (!address) {
    return null;
  }

  const handleGetPriceNow = () => {
    const quote = calculateQuote(sqft, selectedServices, mowingFrequency);

    const details = quote.lineItems
      .map((item) => (item.frequency ? `${item.label} (${item.frequency === "weekly" ? "Weekly" : "Biweekly"})` : item.label))
      .join(", ");

    const finalQuote = {
      details,
      total: formatCurrency(quote.total),
      address,
      area: `${new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(sqft)))} sqft`,
      date: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem(TOTAL_SQFT_STORAGE_KEY, String(Math.max(0, Math.round(sqft))));
      sessionStorage.setItem(FINAL_QUOTE_STORAGE_KEY, JSON.stringify(finalQuote));
    }

    router.push(withTenantPath("/services"));
  };

  const handleStartOver = () => {
    setPolygons([]);
    setSqft(0);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(TOTAL_SQFT_STORAGE_KEY, "0");
      sessionStorage.removeItem(FINAL_QUOTE_STORAGE_KEY);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark">Step 2 of 4</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Measure your lawn area</h1>
      </header>

      <MapDrawer
        address={address}
        initialCenter={center}
        initialPolygons={polygons}
        initialSqft={sqft}
        onAreaChange={setSqft}
        onPolygonsChange={setPolygons}
        onGetPriceNow={handleGetPriceNow}
        onStartOver={handleStartOver}
      />
    </main>
  );
}
