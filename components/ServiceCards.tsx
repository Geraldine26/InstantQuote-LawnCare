"use client";

import { calculateQuote, findTier, formatCurrency, getServicePrice } from "@/lib/pricing";
import { SERVICE_DESCRIPTIONS, SERVICE_KEYS, SERVICE_LABELS, type MowingFrequency, type ServiceKey } from "@/lib/types";

interface ServiceCardsProps {
  sqft: number;
  selectedServices: ServiceKey[];
  mowingFrequency: MowingFrequency;
  onRemove: (service: ServiceKey) => void;
  onAdd: (service: ServiceKey) => void;
  onMowingFrequencyChange: (frequency: MowingFrequency) => void;
}

export function ServiceCards({
  sqft,
  selectedServices,
  mowingFrequency,
  onRemove,
  onAdd,
  onMowingFrequencyChange,
}: ServiceCardsProps) {
  const quote = calculateQuote(sqft, selectedServices, mowingFrequency);
  const selectedSet = new Set(selectedServices);
  const recommended = SERVICE_KEYS.filter((service) => !selectedSet.has(service));
  const tier = findTier(sqft);

  return (
    <div className="space-y-8">
      <section aria-label="Selected services" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Selected Services</h2>
          <span className="text-sm text-slate-600">{quote.lineItems.length} selected</span>
        </div>

        {quote.lineItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No services selected. Add one below.</p>
        ) : (
          <div className="grid gap-3">
            {quote.lineItems.map((item) => (
              <article key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{item.label}</h3>
                    <p className="mt-1 text-sm text-slate-600">{SERVICE_DESCRIPTIONS[item.key]}</p>
                    {item.key === "mowing" && (
                      <div className="mt-3 inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Mowing frequency">
                        <button
                          aria-label="Set mowing to weekly"
                          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                            mowingFrequency === "weekly" ? "bg-slate-900 text-white" : "text-slate-700"
                          }`}
                          onClick={() => onMowingFrequencyChange("weekly")}
                          type="button"
                        >
                          Weekly
                        </button>
                        <button
                          aria-label="Set mowing to biweekly"
                          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                            mowingFrequency === "biweekly" ? "bg-slate-900 text-white" : "text-slate-700"
                          }`}
                          onClick={() => onMowingFrequencyChange("biweekly")}
                          type="button"
                        >
                          Biweekly
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(item.price)}</p>
                    <button
                      aria-label={`Remove ${item.label}`}
                      className="mt-2 text-sm font-medium text-rose-600 transition hover:text-rose-700"
                      onClick={() => onRemove(item.key)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Recommended services" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Recommended</h2>
        {recommended.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">All available services are already selected.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recommended.map((service) => {
              const previewPrice = getServicePrice(tier, service, mowingFrequency);
              return (
                <article key={service} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-base font-semibold text-slate-900">{SERVICE_LABELS[service]}</h3>
                  <p className="mt-1 text-sm text-slate-600">{SERVICE_DESCRIPTIONS[service]}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-base font-bold text-slate-900">{formatCurrency(previewPrice)}</p>
                    <button
                      aria-label={`Add ${SERVICE_LABELS[service]} to visit`}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                      onClick={() => onAdd(service)}
                      type="button"
                    >
                      Add To My Visit
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Estimated total" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">Estimated Total</p>
        <p className="mt-1 text-3xl font-bold text-emerald-700">{formatCurrency(quote.total)}</p>
      </section>
    </div>
  );
}
