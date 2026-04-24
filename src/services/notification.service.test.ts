import { describe, expect, it } from "vitest";

import { isChannelAllowed } from "@/constants/notification-prefs";

// Exercises the pure prefs gate — A10 (client answer 2026-04-21):
//   - Mandatory templates (order_confirmation · ready_for_pickup · pickup_otp)
//     always fire, regardless of what the customer toggled.
//   - Non-mandatory templates fall back to the A10 defaults when the customer
//     has no overrides yet: all ON except in_transit/shipment_update → email OFF.

describe("notification.service.ts — isChannelAllowed", () => {
  describe("mandatory templates always allowed", () => {
    it.each(["order_confirmation", "ready_for_pickup", "pickup_otp"] as const)(
      "%s stays allowed even when customer turns every channel off",
      (template) => {
        const rawPrefs = {
          order_confirmation: { dashboard: false, whatsapp: false, email: false },
          ready_for_pickup: { dashboard: false, whatsapp: false, email: false },
          pickup_otp: { dashboard: false, whatsapp: false, email: false },
        };
        expect(isChannelAllowed(rawPrefs, template, "whatsapp")).toBe(true);
        expect(isChannelAllowed(rawPrefs, template, "email")).toBe(true);
        expect(isChannelAllowed(rawPrefs, template, "dashboard")).toBe(true);
      }
    );
  });

  describe("non-mandatory templates default to A10 matrix when prefs absent", () => {
    it("in_transit: all channels ON except email (per A10)", () => {
      expect(isChannelAllowed(null, "in_transit", "dashboard")).toBe(true);
      expect(isChannelAllowed(null, "in_transit", "whatsapp")).toBe(true);
      expect(isChannelAllowed(null, "in_transit", "email")).toBe(false);
    });

    it("shipment_update: all channels ON except email (per A10)", () => {
      expect(isChannelAllowed(null, "shipment_update", "dashboard")).toBe(true);
      expect(isChannelAllowed(null, "shipment_update", "whatsapp")).toBe(true);
      expect(isChannelAllowed(null, "shipment_update", "email")).toBe(false);
    });

    it("delivered: all channels ON (per A10)", () => {
      expect(isChannelAllowed(null, "delivered", "dashboard")).toBe(true);
      expect(isChannelAllowed(null, "delivered", "whatsapp")).toBe(true);
      expect(isChannelAllowed(null, "delivered", "email")).toBe(true);
    });
  });

  describe("customer overrides respected for non-mandatory templates", () => {
    it("customer turns off WhatsApp for in_transit", () => {
      const rawPrefs = {
        in_transit: { dashboard: true, whatsapp: false, email: false },
      };
      expect(isChannelAllowed(rawPrefs, "in_transit", "whatsapp")).toBe(false);
      expect(isChannelAllowed(rawPrefs, "in_transit", "dashboard")).toBe(true);
    });

    it("customer opts in to email for in_transit (overrides default OFF)", () => {
      const rawPrefs = {
        in_transit: { dashboard: true, whatsapp: true, email: true },
      };
      expect(isChannelAllowed(rawPrefs, "in_transit", "email")).toBe(true);
    });

    it("customer turns off all channels for delivered", () => {
      const rawPrefs = {
        delivered: { dashboard: false, whatsapp: false, email: false },
      };
      expect(isChannelAllowed(rawPrefs, "delivered", "whatsapp")).toBe(false);
      expect(isChannelAllowed(rawPrefs, "delivered", "email")).toBe(false);
    });
  });

  describe("partial / malformed prefs blobs fall back to defaults", () => {
    it("empty object", () => {
      expect(isChannelAllowed({}, "in_transit", "whatsapp")).toBe(true);
    });

    it("partial override only for one template keeps the rest at defaults", () => {
      const rawPrefs = {
        in_transit: { dashboard: true, whatsapp: false, email: false },
      };
      expect(isChannelAllowed(rawPrefs, "delivered", "email")).toBe(true);
      expect(isChannelAllowed(rawPrefs, "shipment_update", "email")).toBe(false);
    });

    it("non-object garbage → defaults", () => {
      expect(isChannelAllowed("not an object", "delivered", "email")).toBe(true);
      expect(isChannelAllowed(42, "in_transit", "whatsapp")).toBe(true);
    });
  });
});
