import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DeliveryMode } from "@/types/enums";
import type {
  DeliverySpeedInput as DeliverySpeed,
  ParcelItemInput,
} from "@/validations/shipment.schema";

export type { DeliverySpeed };

/** A1 (client answer 2026-04-21): up to 5 parcels per booking, same destination. */
export const MAX_PARCELS_PER_BOOKING = 5;

/** Route-aware quote snapshot cached from POST /api/shipments/quote. Drives
 *  Step 2–4 price displays so the wizard stays consistent with server math. */
export type QuoteSnapshot = {
  deliveryMode: "internal" | "sendcloud";
  originPostcode: string;
  destinationPostcode: string;
  quotedAt: string; // ISO timestamp for UI freshness display / TTL invalidation.
  parcels: Array<{
    parcelIndex: number;
    presetSlug: "mini" | "small" | "medium" | "large";
    billableWeightKg: number;
    /** Ex-VAT insurance tier cost per Q15.2 — included in the VAT base. */
    insuranceSurchargeCents: number;
    /** Ex-VAT delivery per speed (matches the BCN matrix figure). Null entries
     *  mean the speed is unavailable for this route/parcel (e.g. Next Day on
     *  SendCloud). Shown in the per-parcel breakdown list. */
    shippingCents: {
      standard: number | null;
      express: number | null;
      next_day: number | null;
    };
    /** Per-parcel total paid per speed (shipping + insurance + VAT). */
    totalCents: {
      standard: number | null;
      express: number | null;
      next_day: number | null;
    };
  }>;
  totals: {
    standard: number | null;
    express: number | null;
    next_day: number | null;
  };
};

// `parcels[]` is an array from day one so multi-parcel (A1) becomes a UI
// change, not a store migration.
// `requestedSpeed` vs `actualSpeed` is the "intent vs commitment" pattern:
// user picks a preference; the platform may auto-downgrade based on route.
// Sender edits update the local store only (A4 safe default — profile row
// is not mutated).

export type BookingStep = 1 | 2 | 3 | 4;

export type BookingSender = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  email: string;
  /** Q3.1 — base city sourced from profile; null when the user hasn't set one. */
  city: string | null;
  /** True once user edited any sender field; signal for A4-option-b toggle. */
  overriddenLocally: boolean;
};

export type BookingRecipient = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  email: string;
};

export type BookingLocation = {
  postcode: string;
  pickupPointId: string | null;
};

/** Per-parcel price snapshot cached after a quote; Step 5 reads this. */
export type ParcelQuoteSnapshot = {
  parcelId: string;
  standardCents: number | null;
  expressCents: number | null;
  nextDayCents: number | null;
};

/** Field-keyed recipient errors handed back from a failed Pay attempt. Step 3
 *  consumes this on mount, applies the messages via `setError` to the matching
 *  inputs, then clears it. Intentionally NOT persisted (see partialize below)
 *  so a stale failure can't haunt a fresh tab open. Values are translation
 *  keys like "validation.nameMin" so the same i18n pipeline used for client
 *  validation renders the server-derived errors. */
export type RecipientFieldErrors = Partial<{
  receiver_first_name: string;
  receiver_last_name: string;
  receiver_phone: string;
  receiver_whatsapp: string;
  receiver_email: string;
}>;

type BookingState = {
  currentStep: BookingStep;

  requestedSpeed: DeliverySpeed | null;

  parcels: ParcelItemInput[];
  origin: BookingLocation | null;
  destination: BookingLocation | null;
  sender: BookingSender | null;
  recipient: BookingRecipient | null;
  deliveryMode: DeliveryMode | null;
  actualSpeed: DeliverySpeed | null;
  speedAdjustedReason: "route_not_barcelona" | "carrier_not_available" | null;
  quoteSnapshots: ParcelQuoteSnapshot[] | null;
  /** Latest server-authoritative quote. Invalidated whenever any input that
   *  affects pricing (parcels, origin, destination) changes. */
  quote: QuoteSnapshot | null;
  /** Server-flagged recipient errors from the last create-checkout attempt.
   *  Consumed by Step 3 on mount; null when no pending errors. */
  pendingRecipientErrors: RecipientFieldErrors | null;
};

type BookingActions = {
  setStep: (step: BookingStep) => void;

  setRequestedSpeed: (speed: DeliverySpeed | null) => void;
  setActualSpeed: (
    speed: DeliverySpeed | null,
    reason?: BookingState["speedAdjustedReason"]
  ) => void;

  setParcels: (parcels: ParcelItemInput[]) => void;
  addParcel: (parcel: ParcelItemInput) => void;
  updateParcel: (index: number, parcel: ParcelItemInput) => void;
  /**
   * Insurance-only parcel update. Declared value / wants_insurance don't
   * affect the carrier rate, so this path leaves the cached `quote` intact.
   * Step 4 calls this from the InsuranceSection so editing insurance there
   * does not invalidate the SendCloud rate the user is reviewing.
   */
  setParcelInsurance: (index: number, declaredValueCents: number, wantsInsurance: boolean) => void;
  removeParcel: (index: number) => void;

  setOrigin: (origin: BookingLocation | null) => void;
  setDestination: (destination: BookingLocation | null) => void;

  hydrateSenderFromProfile: (profile: Omit<BookingSender, "overriddenLocally">) => void;
  updateSender: (patch: Partial<Omit<BookingSender, "overriddenLocally">>) => void;
  setRecipient: (recipient: BookingRecipient | null) => void;

  setDeliveryMode: (mode: DeliveryMode | null) => void;
  setQuoteSnapshots: (snapshots: ParcelQuoteSnapshot[] | null) => void;
  setQuote: (quote: QuoteSnapshot | null) => void;

  setPendingRecipientErrors: (errors: RecipientFieldErrors | null) => void;

  reset: () => void;
};

const initialState: BookingState = {
  currentStep: 1,
  // Default 'standard' lets Step 1 render baseline prices without a pre-wizard
  // speed picker. The Step 4 speed panel (moved there per Final A2, 2026-04-23)
  // overwrites this as the user chooses Express / Next Day.
  requestedSpeed: "standard",
  parcels: [],
  origin: null,
  destination: null,
  sender: null,
  recipient: null,
  deliveryMode: null,
  actualSpeed: null,
  speedAdjustedReason: null,
  quoteSnapshots: null,
  quote: null,
  pendingRecipientErrors: null,
};

export const useBookingStore = create<BookingState & BookingActions>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      setRequestedSpeed: (speed) =>
        set({
          requestedSpeed: speed,
          // Speed change invalidates pricing; re-quote on next Step 5 entry.
          actualSpeed: null,
          speedAdjustedReason: null,
          quoteSnapshots: null,
        }),
      setActualSpeed: (speed, reason = null) =>
        set({ actualSpeed: speed, speedAdjustedReason: reason }),

      setParcels: (parcels) =>
        set({
          // Hard cap enforced at the action boundary so UI + webhook stay aligned.
          parcels: parcels.slice(0, MAX_PARCELS_PER_BOOKING),
          quoteSnapshots: null,
          quote: null,
        }),
      addParcel: (parcel) =>
        set((s) =>
          s.parcels.length >= MAX_PARCELS_PER_BOOKING
            ? s
            : { parcels: [...s.parcels, parcel], quoteSnapshots: null, quote: null }
        ),
      updateParcel: (index, parcel) =>
        set((s) => ({
          parcels: s.parcels.map((p, i) => (i === index ? parcel : p)),
          quoteSnapshots: null,
          quote: null,
        })),
      setParcelInsurance: (index, declaredValueCents, wantsInsurance) =>
        set((s) => ({
          parcels: s.parcels.map((p, i) =>
            i === index
              ? {
                  ...p,
                  declared_value_cents: declaredValueCents,
                  wants_insurance: wantsInsurance,
                }
              : p
          ),
        })),
      removeParcel: (index) =>
        set((s) => ({
          parcels: s.parcels.filter((_, i) => i !== index),
          quoteSnapshots: null,
          quote: null,
        })),

      setOrigin: (origin) =>
        set({
          origin,
          // Changing origin invalidates routing + pricing.
          deliveryMode: null,
          quoteSnapshots: null,
          quote: null,
        }),
      setDestination: (destination) =>
        set({
          destination,
          deliveryMode: null,
          quoteSnapshots: null,
          quote: null,
        }),

      hydrateSenderFromProfile: (profile) =>
        set((s) => ({
          sender: s.sender?.overriddenLocally ? s.sender : { ...profile, overriddenLocally: false },
        })),
      updateSender: (patch) =>
        set((s) => ({
          sender: s.sender ? { ...s.sender, ...patch, overriddenLocally: true } : null,
        })),

      setRecipient: (recipient) => set({ recipient }),

      setDeliveryMode: (mode) => set({ deliveryMode: mode, quoteSnapshots: null, quote: null }),
      setQuoteSnapshots: (snapshots) => set({ quoteSnapshots: snapshots }),
      setQuote: (quote) => set({ quote }),

      setPendingRecipientErrors: (errors) => set({ pendingRecipientErrors: errors }),

      reset: () => set(initialState),
    }),
    {
      name: "laveina-booking",
      // v7: Q15.2 VAT overhaul — quote snapshot now stores ex-VAT delivery
      // (`shippingCents`) per speed instead of VAT-inclusive subtotal. Older
      // drafts cached under v6 store the old semantic and would misprice on
      // Step 4, so we wipe them on upgrade.
      version: 7,
      migrate: () => initialState,
      // `pendingRecipientErrors` is a transient handoff between Step 4 and
      // Step 3 — it must not survive a page reload, otherwise a user who
      // closed the tab after a failed Pay would reopen Step 3 with stale
      // server errors that may no longer apply. Explicit null write means
      // rehydration always restores it to null without needing migrations.
      partialize: (state) => ({ ...state, pendingRecipientErrors: null }),
    }
  )
);
