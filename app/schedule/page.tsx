"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LeadForm } from "@/components/LeadForm";
import { calculateQuote, formatCurrency } from "@/lib/pricing";
import { useQuoteStore } from "@/store/quoteStore";

export default function SchedulePage() {
  const router = useRouter();
  const { address, sqft, selectedServices, mowingFrequency } = useQuoteStore((state) => ({
    address: state.address,
    sqft: state.sqft,
    selectedServices: state.selectedServices,
    mowingFrequency: state.mowingFrequency,
  }));

  useEffect(() => {
    if (!address) {
      router.replace("/");
      return;
    }

    if (sqft <= 0) {
      router.replace("/measure");
      return;
    }

    if (selectedServices.length === 0) {
      router.replace("/services");
    }
  }, [address, router, selectedServices.length, sqft]);

  if (!address || sqft <= 0 || selectedServices.length === 0) {
    return null;
  }

  const quote = calculateQuote(sqft, selectedServices, mowingFrequency);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark">Step 4 of 4</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Schedule your service</h1>
        <p className="mt-2 text-sm text-slate-600">Submit your details and we will send this quote to you by email.</p>

        <div className="mt-6 rounded-xl border border-brand/20 bg-brand/10 p-4">
          <p className="text-sm text-slate-600">Address</p>
          <p className="font-semibold text-slate-900">{address}</p>
          <p className="mt-2 text-sm text-slate-600">
            Area: {new Intl.NumberFormat("en-US").format(sqft)} sqft | Services: {quote.lineItems.length} | Total: {formatCurrency(quote.total)}
          </p>
        </div>

        <div className="mt-6">
          <LeadForm />
        </div>
      </section>
    </main>
  );
}
