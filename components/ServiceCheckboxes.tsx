"use client";

import { SERVICE_DESCRIPTIONS, SERVICE_KEYS, SERVICE_LABELS, type ServiceKey } from "@/lib/types";

interface ServiceCheckboxesProps {
  selectedServices: ServiceKey[];
  onToggle: (service: ServiceKey) => void;
}

export function ServiceCheckboxes({ selectedServices, onToggle }: ServiceCheckboxesProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-slate-700">Select services for your visit</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {SERVICE_KEYS.map((service) => {
          const checked = selectedServices.includes(service);

          return (
            <label
              key={service}
              className={`cursor-pointer rounded-xl border p-4 transition ${
                checked ? "border-brand bg-brand/10 shadow-soft" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  aria-label={SERVICE_LABELS[service]}
                  checked={checked}
                  className="mt-1 h-4 w-4 accent-brand"
                  onChange={() => onToggle(service)}
                  type="checkbox"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{SERVICE_LABELS[service]}</p>
                  <p className="mt-1 text-xs text-slate-600">{SERVICE_DESCRIPTIONS[service]}</p>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
