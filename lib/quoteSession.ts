export const QUOTE_SESSION_KEYS = {
  totalSqft: "gl_quote_total_sqft",
  finalQuote: "gl_final_quote",
  step1: "gl_quote_step1",
  address: "gl_quote_address",
} as const;

export interface Step1SessionData {
  address: string;
  center: { lat: number; lng: number } | null;
}

export function clearQuoteSessionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(QUOTE_SESSION_KEYS.totalSqft);
  sessionStorage.removeItem(QUOTE_SESSION_KEYS.finalQuote);
  sessionStorage.removeItem(QUOTE_SESSION_KEYS.step1);
  sessionStorage.removeItem(QUOTE_SESSION_KEYS.address);
}

export function saveStep1SessionData(payload: Step1SessionData) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedAddress = payload.address.trim();

  sessionStorage.setItem(QUOTE_SESSION_KEYS.address, normalizedAddress);
  sessionStorage.setItem(
    QUOTE_SESSION_KEYS.step1,
    JSON.stringify({
      address: normalizedAddress,
      center: payload.center,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function readStep1SessionData(): Step1SessionData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(QUOTE_SESSION_KEYS.step1);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Step1SessionData>;
    const address = typeof parsed.address === "string" ? parsed.address.trim() : "";

    if (!address) {
      return null;
    }

    const center =
      parsed.center && typeof parsed.center.lat === "number" && typeof parsed.center.lng === "number"
        ? { lat: parsed.center.lat, lng: parsed.center.lng }
        : null;

    return {
      address,
      center,
    };
  } catch {
    return null;
  }
}
