import { describe, expect, it } from "vitest";

import { isValidTransition, STATUS_TRANSITIONS } from "@/constants/status-transitions";
import { ShipmentStatus } from "@/types/enums";

describe("status-transitions", () => {
  describe("STATUS_TRANSITIONS", () => {
    it("covers all 7 shipment statuses", () => {
      const allStatuses = Object.values(ShipmentStatus);
      expect(allStatuses).toHaveLength(7);

      for (const status of allStatuses) {
        expect(STATUS_TRANSITIONS).toHaveProperty(status);
      }
    });

    it("delivered is a terminal state with no transitions", () => {
      expect(STATUS_TRANSITIONS[ShipmentStatus.DELIVERED]).toEqual([]);
    });

    it("each status has exactly one valid next status (linear flow)", () => {
      const nonTerminal = Object.values(ShipmentStatus).filter(
        (s) => s !== ShipmentStatus.DELIVERED
      );

      for (const status of nonTerminal) {
        expect(STATUS_TRANSITIONS[status]).toHaveLength(1);
      }
    });
  });

  describe("isValidTransition", () => {
    it("allows payment_confirmed → waiting_at_origin", () => {
      expect(
        isValidTransition(ShipmentStatus.PAYMENT_CONFIRMED, ShipmentStatus.WAITING_AT_ORIGIN)
      ).toBe(true);
    });

    it("allows waiting_at_origin → received_at_origin", () => {
      expect(
        isValidTransition(ShipmentStatus.WAITING_AT_ORIGIN, ShipmentStatus.RECEIVED_AT_ORIGIN)
      ).toBe(true);
    });

    it("allows received_at_origin → in_transit", () => {
      expect(isValidTransition(ShipmentStatus.RECEIVED_AT_ORIGIN, ShipmentStatus.IN_TRANSIT)).toBe(
        true
      );
    });

    it("allows in_transit → arrived_at_destination", () => {
      expect(
        isValidTransition(ShipmentStatus.IN_TRANSIT, ShipmentStatus.ARRIVED_AT_DESTINATION)
      ).toBe(true);
    });

    it("allows arrived_at_destination → ready_for_pickup", () => {
      expect(
        isValidTransition(ShipmentStatus.ARRIVED_AT_DESTINATION, ShipmentStatus.READY_FOR_PICKUP)
      ).toBe(true);
    });

    it("allows ready_for_pickup → delivered", () => {
      expect(isValidTransition(ShipmentStatus.READY_FOR_PICKUP, ShipmentStatus.DELIVERED)).toBe(
        true
      );
    });

    it("rejects backward transition: in_transit → waiting_at_origin", () => {
      expect(isValidTransition(ShipmentStatus.IN_TRANSIT, ShipmentStatus.WAITING_AT_ORIGIN)).toBe(
        false
      );
    });

    it("rejects skipping a step: payment_confirmed → in_transit", () => {
      expect(isValidTransition(ShipmentStatus.PAYMENT_CONFIRMED, ShipmentStatus.IN_TRANSIT)).toBe(
        false
      );
    });

    it("rejects transition from terminal state (delivered)", () => {
      expect(isValidTransition(ShipmentStatus.DELIVERED, ShipmentStatus.WAITING_AT_ORIGIN)).toBe(
        false
      );
    });

    it("rejects same-status transition", () => {
      expect(isValidTransition(ShipmentStatus.IN_TRANSIT, ShipmentStatus.IN_TRANSIT)).toBe(false);
    });

    it("returns false for unknown status", () => {
      expect(isValidTransition("unknown_status", ShipmentStatus.DELIVERED)).toBe(false);
    });
  });
});
