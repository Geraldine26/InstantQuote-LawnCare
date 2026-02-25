"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { ServiceCheckboxes } from "@/components/ServiceCheckboxes";
import { clearQuoteSessionStorage, readStep1SessionData, saveStep1SessionData } from "@/lib/quoteSession";
import { useQuoteStore } from "@/store/quoteStore";
import { useTenant, useTenantRouting } from "@/src/components/TenantProvider";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = useTenant();
  const { withTenantPath } = useTenantRouting();

  const {
    address,
    selectedServices,
    setAddress,
    setCenter,
    setPolygons,
    setSqft,
    toggleService,
    resetQuote,
  } = useQuoteStore((state) => ({
    address: state.address,
    selectedServices: state.selectedServices,
    setAddress: state.setAddress,
    setCenter: state.setCenter,
    setPolygons: state.setPolygons,
    setSqft: state.setSqft,
    toggleService: state.toggleService,
    resetQuote: state.resetQuote,
  }));

  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const continueQuote = searchParams.get("continue") === "1";

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    if (continueQuote) {
      const stored = readStep1SessionData();

      if (stored && !address.trim()) {
        setAddress(stored.address);
        setCenter(stored.center);
      }

      return;
    }

    resetQuote();
    clearQuoteSessionStorage();
  }, [address, continueQuote, resetQuote, setAddress, setCenter]);

  const resetMeasurementState = () => {
    setPolygons([]);
    setSqft(0);
    clearQuoteSessionStorage();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!address.trim()) {
      setError("Please enter your property address.");
      return;
    }

    if (selectedServices.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    setError(null);
    router.push(withTenantPath("/measure"));
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-dark">{tenant.brandName}</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">Get an exact lawn care price in minutes.</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          {tenant.tagline ?? "Enter your address, choose your services, then measure your lawn on the map to unlock your instant quote."}
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <AddressAutocomplete
            onChange={(nextAddress) => {
              if (normalizeAddress(nextAddress) !== normalizeAddress(address)) {
                resetMeasurementState();
                setCenter(null);
              }

              setAddress(nextAddress);
              setError(null);
            }}
            onSelect={({ address: selectedAddress, center: selectedCenter }) => {
              if (normalizeAddress(selectedAddress) !== normalizeAddress(address)) {
                resetMeasurementState();
              }

              setAddress(selectedAddress);
              setCenter(selectedCenter);
              saveStep1SessionData({
                address: selectedAddress,
                center: selectedCenter,
              });
              setError(null);
            }}
            required
            value={address}
          />

          <ServiceCheckboxes selectedServices={selectedServices} onToggle={toggleService} />

          <button
            aria-label="Go to map measurement step"
            className="w-full rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white transition hover:bg-brand/90"
            type="submit"
          >
            Get My Instant Price
          </button>

          {error && <p className="text-sm font-medium text-rose-700">{error}</p>}
        </form>
      </section>
    </main>
  );
}
