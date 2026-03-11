import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PriceBreakdown } from "@/types/shipment";

type SenderInfo = {
  name: string;
  phone: string;
  email?: string;
};

type ReceiverInfo = {
  name: string;
  phone: string;
  email?: string;
};

type SelectedPickupPoints = {
  originId: string;
  destinationId: string;
  originPostcode: string;
  destinationPostcode: string;
};

type ParcelDetails = {
  weightKg: number;
  description?: string;
};

type BookingStep = 1 | 2 | 3 | 4 | 5;

type BookingState = {
  currentStep: BookingStep;
  senderInfo: SenderInfo | null;
  receiverInfo: ReceiverInfo | null;
  selectedPickupPoints: SelectedPickupPoints | null;
  parcelDetails: ParcelDetails | null;
  priceBreakdown: PriceBreakdown | null;
};

type BookingActions = {
  setStep: (step: BookingStep) => void;
  setSenderInfo: (info: SenderInfo) => void;
  setReceiverInfo: (info: ReceiverInfo) => void;
  setPickupPoints: (points: SelectedPickupPoints) => void;
  setParcelDetails: (details: ParcelDetails) => void;
  setPriceBreakdown: (breakdown: PriceBreakdown) => void;
  reset: () => void;
};

const initialState: BookingState = {
  currentStep: 1,
  senderInfo: null,
  receiverInfo: null,
  selectedPickupPoints: null,
  parcelDetails: null,
  priceBreakdown: null,
};

export const useBookingStore = create<BookingState & BookingActions>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      setSenderInfo: (info) =>
        set({ senderInfo: info, currentStep: 2 }),

      setReceiverInfo: (info) =>
        set({ receiverInfo: info, currentStep: 3 }),

      setPickupPoints: (points) =>
        set({ selectedPickupPoints: points, currentStep: 4 }),

      setParcelDetails: (details) =>
        set({ parcelDetails: details, currentStep: 5 }),

      setPriceBreakdown: (breakdown) =>
        set({ priceBreakdown: breakdown }),

      reset: () => set(initialState),
    }),
    {
      name: "laveina-booking",
    },
  ),
);
