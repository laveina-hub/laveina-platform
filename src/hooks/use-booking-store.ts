import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DeliveryMode } from "@/types/enums";
import type { PriceBreakdown } from "@/types/shipment";
import type {
  BookingStepContactInput,
  BookingStepOriginInput,
  BookingStepDestinationInput,
  BookingStepSpeedInput,
  ParcelItemInput,
} from "@/validations/shipment.schema";

export type BookingStep = 1 | 2 | 3 | 4 | 5;

type BookingState = {
  currentStep: BookingStep;
  contact: BookingStepContactInput | null;
  origin: BookingStepOriginInput | null;
  destination: BookingStepDestinationInput | null;
  parcels: ParcelItemInput[];
  speed: BookingStepSpeedInput | null;
  deliveryMode: DeliveryMode | null;
  priceBreakdowns: PriceBreakdown[] | null;
};

type BookingActions = {
  setStep: (step: BookingStep) => void;
  setContact: (data: BookingStepContactInput) => void;
  setOrigin: (data: BookingStepOriginInput) => void;
  setDestination: (data: BookingStepDestinationInput) => void;
  setParcels: (parcels: ParcelItemInput[]) => void;
  setSpeed: (data: BookingStepSpeedInput) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setPriceBreakdowns: (breakdowns: PriceBreakdown[]) => void;
  reset: () => void;
};

const initialState: BookingState = {
  currentStep: 1,
  contact: null,
  origin: null,
  destination: null,
  parcels: [],
  speed: null,
  deliveryMode: null,
  priceBreakdowns: null,
};

export const useBookingStore = create<BookingState & BookingActions>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      setContact: (data) => set({ contact: data, currentStep: 2 }),

      setOrigin: (data) => set({ origin: data, currentStep: 3 }),

      setDestination: (data) => set({ destination: data, currentStep: 4 }),

      setParcels: (parcels) => set({ parcels, currentStep: 5, priceBreakdowns: null }),

      setSpeed: (data) => set({ speed: data }),

      setDeliveryMode: (mode) =>
        set({
          deliveryMode: mode,
          speed: null,
          priceBreakdowns: null,
        }),

      setPriceBreakdowns: (breakdowns) => set({ priceBreakdowns: breakdowns }),

      reset: () => set(initialState),
    }),
    {
      name: "laveina-booking",
      version: 3,
      migrate: () => {
        return initialState;
      },
    }
  )
);
