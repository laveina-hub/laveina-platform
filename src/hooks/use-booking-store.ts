import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DeliveryMode } from "@/types/enums";
import type { PriceBreakdown } from "@/types/shipment";
import type {
  BookingStepContactInput,
  BookingStepOriginInput,
  BookingStepDestinationInput,
  BookingStepParcelInput,
  BookingStepSpeedInput,
} from "@/validations/shipment.schema";

// ─── Step index ───────────────────────────────────────────────────────────────
// Step 5 (speed) is skipped for internal (Barcelona) routes — handled in UI.

export type BookingStep = 1 | 2 | 3 | 4 | 5;

// ─── State ────────────────────────────────────────────────────────────────────

type BookingState = {
  currentStep: BookingStep;
  /** Step 1 — sender + receiver contact info */
  contact: BookingStepContactInput | null;
  /** Step 2 — origin postcode + pickup point */
  origin: BookingStepOriginInput | null;
  /** Step 3 — destination postcode + pickup point */
  destination: BookingStepDestinationInput | null;
  /** Step 4 — parcel size, weight, insurance */
  parcel: BookingStepParcelInput | null;
  /** Step 5 — delivery speed (null for internal routes) */
  speed: BookingStepSpeedInput | null;
  /** Detected after steps 2+3 are completed */
  deliveryMode: DeliveryMode | null;
  /** Resolved from DB (parcel_size_config) in Step 4 — used by Step 5 for rate calculation */
  parcelDimensions: { lengthCm: number; widthCm: number; heightCm: number } | null;
  /** Returned by POST /api/shipments/get-rates after step 4 */
  priceBreakdown: PriceBreakdown | null;
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type BookingActions = {
  setStep: (step: BookingStep) => void;
  setContact: (data: BookingStepContactInput) => void;
  setOrigin: (data: BookingStepOriginInput) => void;
  setDestination: (data: BookingStepDestinationInput) => void;
  setParcel: (
    data: BookingStepParcelInput,
    dimensions: { lengthCm: number; widthCm: number; heightCm: number }
  ) => void;
  setSpeed: (data: BookingStepSpeedInput) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setPriceBreakdown: (breakdown: PriceBreakdown) => void;
  reset: () => void;
};

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: BookingState = {
  currentStep: 1,
  contact: null,
  origin: null,
  destination: null,
  parcel: null,
  speed: null,
  deliveryMode: null,
  parcelDimensions: null,
  priceBreakdown: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState & BookingActions>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      setContact: (data) => set({ contact: data, currentStep: 2 }),

      setOrigin: (data) => set({ origin: data, currentStep: 3 }),

      setDestination: (data) => set({ destination: data, currentStep: 4 }),

      setParcel: (data, dimensions) =>
        set({ parcel: data, parcelDimensions: dimensions, currentStep: 5, priceBreakdown: null }),

      setSpeed: (data) => set({ speed: data }),

      setDeliveryMode: (mode) =>
        set({
          deliveryMode: mode,
          // Clear speed selection when mode changes (internal has no speed choice)
          speed: null,
        }),

      setPriceBreakdown: (breakdown) => set({ priceBreakdown: breakdown }),

      reset: () => set(initialState),
    }),
    {
      name: "laveina-booking",
    }
  )
);
