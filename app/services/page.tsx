"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { ServiceCards } from "@/components/ServiceCards";
import { calculateQuote } from "@/lib/pricing";
import { useQuoteStore } from "@/store/quoteStore";

export default function ServicesPage() {
  const router = useRouter();
  const { address, sqft, selectedServices, mowingFrequency, addService, removeService, setMowingFrequency } = useQuoteStore((state) => ({
    address: state.address,
    sqft: state.sqft,
    selectedServices: state.selectedServices,
    mowingFrequency: state.mowingFrequency,
    addService: state.addService,
    removeService: state.removeService,
    setMowingFrequency: state.setMowingFrequency,
  }));

  const quote = useMemo(() => calculateQuote(sqft, selectedServices, mowingFrequency), [sqft, selectedServices, mowingFrequency]);

  useEffect(() => {
    if (!address) {
      router.replace("/");
      return;
    }

    if (sqft <= 0) {
      router.replace("/measure");
    }
  }, [address, router, sqft]);

  if (!address || sqft <= 0) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark">Step 3 of 4</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Fine-tune your service package</h1>
        <p className="mt-2 text-sm text-slate-600">Lawn size: {new Intl.NumberFormat("en-US").format(sqft)} sqft</p>
      </header>

      <ServiceCards
        mowingFrequency={mowingFrequency}
        onAdd={addService}
        onMowingFrequencyChange={setMowingFrequency}
        onRemove={removeService}
        selectedServices={selectedServices}
        sqft={sqft}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          aria-label="Back to measurement step"
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => router.push("/measure")}
          type="button"
        >
          Back
        </button>
        <button
          aria-label="Go to schedule step"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
          disabled={quote.lineItems.length === 0}
          onClick={() => router.push("/schedule")}
          type="button"
        >
          Schedule My Service
        </button>
      </div>
    </main>
  );
}
