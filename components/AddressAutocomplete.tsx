"use client";

import { useEffect, useRef, useState } from "react";

import { hasGoogleMapsApiKey, loadGoogleMaps } from "@/lib/googleMapsLoader";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (payload: { address: string; center: { lat: number; lng: number } | null }) => void;
  id?: string;
  required?: boolean;
}

export function AddressAutocomplete({ value, onChange, onSelect, id = "address", required = false }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const initializedRef = useRef(false);

  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);

  const [mapsError, setMapsError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSelectRef.current = onSelect;
  }, [onChange, onSelect]);

  useEffect(() => {
    let cancelled = false;

    async function initAutocomplete() {
      if (initializedRef.current || !inputRef.current || !hasGoogleMapsApiKey()) {
        return;
      }

      try {
        const google = await loadGoogleMaps();

        if (cancelled || !inputRef.current) {
          return;
        }

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry"],
          types: ["address"],
        });

        autocompleteRef.current = autocomplete;
        initializedRef.current = true;

        placeChangedListenerRef.current = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const selectedAddress = place.formatted_address ?? inputRef.current?.value ?? "";

          const center = place.geometry?.location
            ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }
            : null;

          onChangeRef.current(selectedAddress);
          onSelectRef.current({ address: selectedAddress, center });
        });
      } catch (error) {
        setMapsError(error instanceof Error ? error.message : "Failed to load Google Maps.");
      }
    }

    void initAutocomplete();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      placeChangedListenerRef.current?.remove();
      placeChangedListenerRef.current = null;
      autocompleteRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        Property Address
      </label>
      <input
        id={id}
        ref={inputRef}
        aria-label="Property address"
        autoComplete="street-address"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        onChange={(event) => onChangeRef.current(event.target.value)}
        placeholder="Start typing your address"
        required={required}
        value={value}
      />
      {mapsError && <p className="text-sm text-rose-700">{mapsError}</p>}
      {!hasGoogleMapsApiKey() && (
        <p className="text-sm text-amber-700">Google Places is unavailable until `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured.</p>
      )}
    </div>
  );
}
