"use client";

import { FormEvent, useMemo, useState } from "react";

import { calculateQuote, formatCurrency } from "@/lib/pricing";
import { useQuoteStore } from "@/store/quoteStore";
import { useTenantRouting } from "@/src/components/TenantProvider";

interface LeadFormProps {
  onSuccess?: () => void;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

export function LeadForm({ onSuccess }: LeadFormProps) {
  const { withTenantPath } = useTenantRouting();
  const {
    address,
    sqft,
    selectedServices,
    mowingFrequency,
    lead,
    setAddress,
    setLeadField,
  } = useQuoteStore((state) => ({
    address: state.address,
    sqft: state.sqft,
    selectedServices: state.selectedServices,
    mowingFrequency: state.mowingFrequency,
    lead: state.lead,
    setAddress: state.setAddress,
    setLeadField: state.setLeadField,
  }));

  const quote = useMemo(() => calculateQuote(sqft, selectedServices, mowingFrequency), [sqft, selectedServices, mowingFrequency]);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitState("submitting");
    setMessage("");

    const payload = {
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address,
      preferredDate: lead.preferredDate || null,
      sqft,
      services: quote.lineItems.map((item) =>
        item.key === "mowing"
          ? {
              key: item.key,
              frequency: mowingFrequency,
              price: item.price,
            }
          : {
              key: item.key,
              price: item.price,
            },
      ),
      total: quote.total,
    };

    try {
      const endpoint = withTenantPath("/api/quote");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to submit quote at this time.");
      }

      setSubmitState("success");
      setMessage("Your quote was sent successfully. Please check your email.");
      onSuccess?.();
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit quote at this time.");
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="lead-name" className="mb-1 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <input
            id="lead-name"
            aria-label="Full name"
            autoComplete="name"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setLeadField("name", event.target.value)}
            placeholder="Jane Smith"
            required
            type="text"
            value={lead.name}
          />
        </div>

        <div>
          <label htmlFor="lead-phone" className="mb-1 block text-sm font-medium text-slate-700">
            Mobile Number
          </label>
          <input
            id="lead-phone"
            aria-label="Mobile number"
            autoComplete="tel"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setLeadField("phone", event.target.value)}
            placeholder="(801) 555-0199"
            required
            type="tel"
            value={lead.phone}
          />
        </div>

        <div>
          <label htmlFor="lead-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="lead-email"
            aria-label="Email address"
            autoComplete="email"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setLeadField("email", event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={lead.email}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="lead-address" className="mb-1 block text-sm font-medium text-slate-700">
            Address
          </label>
          <input
            id="lead-address"
            aria-label="Address"
            autoComplete="street-address"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setAddress(event.target.value)}
            required
            type="text"
            value={address}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferred-date" className="mb-1 block text-sm font-medium text-slate-700">
            Preferred Date (Optional)
          </label>
          <input
            id="preferred-date"
            aria-label="Preferred service date"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setLeadField("preferredDate", event.target.value)}
            type="date"
            value={lead.preferredDate}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-brand/25 bg-brand/10 p-4">
        <p className="text-sm text-brand-dark">Estimated Total</p>
        <p className="text-2xl font-bold text-brand-dark">{formatCurrency(quote.total)}</p>
      </div>

      <button
        aria-label="Submit quote request"
        className="w-full rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
        disabled={submitState === "submitting"}
        type="submit"
      >
        {submitState === "submitting" ? "Submitting..." : "Submit Quote"}
      </button>

      {message && (
        <p className={`text-sm ${submitState === "success" ? "text-brand-dark" : "text-rose-700"}`}>{message}</p>
      )}
    </form>
  );
}
