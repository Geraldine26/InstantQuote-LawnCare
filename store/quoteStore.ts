import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MowingFrequency, ServiceKey } from "@/lib/types";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

interface LeadDetails {
  name: string;
  phone: string;
  email: string;
  preferredDate: string;
}

interface QuoteState {
  address: string;
  center: LatLngPoint | null;
  polygons: LatLngPoint[][];
  sqft: number;
  selectedServices: ServiceKey[];
  mowingFrequency: MowingFrequency;
  lead: LeadDetails;
  setAddress: (address: string) => void;
  setCenter: (center: LatLngPoint | null) => void;
  setPolygons: (polygons: LatLngPoint[][]) => void;
  setSqft: (sqft: number) => void;
  addService: (service: ServiceKey) => void;
  removeService: (service: ServiceKey) => void;
  toggleService: (service: ServiceKey) => void;
  setMowingFrequency: (frequency: MowingFrequency) => void;
  setLeadField: <K extends keyof LeadDetails>(field: K, value: LeadDetails[K]) => void;
  resetQuote: () => void;
}

const defaultLead: LeadDetails = {
  name: "",
  phone: "",
  email: "",
  preferredDate: "",
};

const initialState = {
  address: "",
  center: null,
  polygons: [],
  sqft: 0,
  selectedServices: ["mowing"] as ServiceKey[],
  mowingFrequency: "weekly" as MowingFrequency,
  lead: defaultLead,
};

export const useQuoteStore = create<QuoteState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setAddress: (address) => set({ address }),
      setCenter: (center) => set({ center }),
      setPolygons: (polygons) => set({ polygons }),
      setSqft: (sqft) => set({ sqft: Math.max(0, Math.round(sqft)) }),
      addService: (service) => {
        const { selectedServices } = get();
        if (selectedServices.includes(service)) {
          return;
        }

        set({ selectedServices: [...selectedServices, service] });
      },
      removeService: (service) => {
        const { selectedServices } = get();
        set({
          selectedServices: selectedServices.filter((item) => item !== service),
        });
      },
      toggleService: (service) => {
        const { selectedServices } = get();
        if (selectedServices.includes(service)) {
          set({ selectedServices: selectedServices.filter((item) => item !== service) });
          return;
        }

        set({ selectedServices: [...selectedServices, service] });
      },
      setMowingFrequency: (frequency) => set({ mowingFrequency: frequency }),
      setLeadField: (field, value) =>
        set((state) => ({
          lead: {
            ...state.lead,
            [field]: value,
          },
        })),
      resetQuote: () =>
        set({
          ...initialState,
          lead: {
            ...defaultLead,
          },
        }),
    }),
    {
      name: "instant-quote-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        address: state.address,
        center: state.center,
        polygons: state.polygons,
        sqft: state.sqft,
        selectedServices: state.selectedServices,
        mowingFrequency: state.mowingFrequency,
        lead: state.lead,
      }),
    },
  ),
);
