import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DeliveryMode, ParcelSize } from "@/types/enums";
import type { PriceBreakdown } from "@/types/shipment";
import type {
  BookingStepContactInput,
  BookingStepOriginInput,
  BookingStepDestinationInput,
  BookingStepSpeedInput,
  ParcelItemInput,
} from "@/validations/shipment.schema";

// ─── Step index ───────────────────────────────────────────────────────────────

export type BookingStep = 1 | 2 | 3 | 4 | 5;

// ─── Per-parcel dimensions resolved from DB ──────────────────────────────────

export type ParcelDimensions = { lengthCm: number; widthCm: number; heightCm: number };

// ─── State ────────────────────────────────────────────────────────────────────

type BookingState = {
  currentStep: BookingStep;
  /** Step 1 — sender + receiver contact info */
  contact: BookingStepContactInput | null;
  /** Step 2 — origin postcode + pickup point */
  origin: BookingStepOriginInput | null;
  /** Step 3 — destination postcode + pickup point */
  destination: BookingStepDestinationInput | null;
  /** Step 4 — one or more parcels (each with size, weight, insurance) */
  parcels: ParcelItemInput[];
  /** DB-resolved dimensions per parcel (same order as parcels array) */
  parcelDimensionsList: ParcelDimensions[];
  /** Step 5 — delivery speed (standard or express), shared for all parcels */
  speed: BookingStepSpeedInput | null;
  /** Detected after steps 2+3 are completed */
  deliveryMode: DeliveryMode | null;
  /** Returned by POST /api/shipments/get-rates after step 4 — per-parcel breakdown */
  priceBreakdowns: PriceBreakdown[] | null;
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type BookingActions = {
  setStep: (step: BookingStep) => void;
  setContact: (data: BookingStepContactInput) => void;
  setOrigin: (data: BookingStepOriginInput) => void;
  setDestination: (data: BookingStepDestinationInput) => void;
  setParcels: (parcels: ParcelItemInput[], dimensions: ParcelDimensions[]) => void;
  setSpeed: (data: BookingStepSpeedInput) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setPriceBreakdowns: (breakdowns: PriceBreakdown[]) => void;
  reset: () => void;
};

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: BookingState = {
  currentStep: 1,
  contact: null,
  origin: null,
  destination: null,
  parcels: [],
  parcelDimensionsList: [],
  speed: null,
  deliveryMode: null,
  priceBreakdowns: null,
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

      setParcels: (parcels, dimensions) =>
        set({ parcels, parcelDimensionsList: dimensions, currentStep: 5, priceBreakdowns: null }),

      setSpeed: (data) => set({ speed: data }),

      setDeliveryMode: (mode) =>
        set({
          deliveryMode: mode,
          // Clear speed selection when mode changes so user re-selects
          speed: null,
        }),

      setPriceBreakdowns: (breakdowns) => set({ priceBreakdowns: breakdowns }),

      reset: () => set(initialState),
    }),
    {
      name: "laveina-booking",
      version: 2,
      migrate: () => {
        // v1 → v2: parcel → parcels[], priceBreakdown → priceBreakdowns[]
        // Simply reset to initial state — in-progress bookings are transient
        return initialState;
      },
    }
  )
);
