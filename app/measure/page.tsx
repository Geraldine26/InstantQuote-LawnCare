"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { MapDrawer } from "@/components/MapDrawer";
import { useQuoteStore } from "@/store/quoteStore";
import { useTenantRouting } from "@/src/components/TenantProvider";

export default function MeasurePage() {
  const router = useRouter();
  const { withTenantPath } = useTenantRouting();
  const { address, center, polygons, sqft, setSqft, setPolygons, resetQuote } = useQuoteStore((state) => ({
    address: state.address,
    center: state.center,
    polygons: state.polygons,
    sqft: state.sqft,
    setSqft: state.setSqft,
    setPolygons: state.setPolygons,
    resetQuote: state.resetQuote,
  }));

  useEffect(() => {
    if (!address) {
      router.replace(withTenantPath("/"));
    }
  }, [address, router, withTenantPath]);

  if (!address) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark">Step 2 of 4</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Measure your lawn area</h1>
        <p className="mt-2 text-sm text-slate-600">Total Area: {new Intl.NumberFormat("en-US").format(sqft)} sqft</p>
      </header>

      <MapDrawer
        address={address}
        initialCenter={center}
        initialPolygons={polygons}
        onAreaChange={setSqft}
        onPolygonsChange={setPolygons}
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          aria-label="Reset quote and return to first step"
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => {
            resetQuote();
            router.push(withTenantPath("/"));
          }}
          type="button"
        >
          Start Over
        </button>
        <button
          aria-label="Go to services step"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
          disabled={sqft <= 0}
          onClick={() => router.push(withTenantPath("/services"))}
          type="button"
        >
          Get Price Now
        </button>
      </div>
    </main>
  );
}
