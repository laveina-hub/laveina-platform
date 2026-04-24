import { describe, expect, it } from "vitest";

import type { PickupPoint, PickupPointWithOverrides } from "@/types/pickup-point";

import { rankPickupPoints } from "./ranking";

// Fixed "now" in UTC so the week/hour checks against the test pickup points
// are deterministic across timezones. Picked mid-morning on a Tuesday so the
// "always open" fixtures look open without any tweaking.
const NOW = new Date("2026-04-21T09:30:00.000Z");

// Lat/lng are arbitrary but preserve the ordering we rely on:
//  - near  (0, 0)   closest to the origin reference below
//  - mid   (0.5, 0) mid-distance
//  - far   (1, 0)   furthest
const ORIGIN = { latitude: 0, longitude: 0 };

type Fixture = Partial<PickupPoint> & {
  id: string;
  latitude: number;
  longitude: number;
};

function point(
  fixture: Fixture,
  overrides?: PickupPointWithOverrides["pickup_point_overrides"]
): PickupPointWithOverrides {
  const base = {
    address: "",
    city: null,
    created_at: "2026-01-01T00:00:00Z",
    email: null,
    image_url: null,
    is_active: true,
    is_open: true,
    name: fixture.id,
    owner_id: null,
    phone: null,
    postcode: "08001",
    updated_at: "2026-01-01T00:00:00Z",
    working_hours: ALWAYS_OPEN,
    ...fixture,
  };
  return {
    ...base,
    pickup_point_overrides: overrides ?? [],
  } as PickupPointWithOverrides;
}

// Open 24/7 so `isOpenNow` always returns true regardless of the test clock.
const ALWAYS_OPEN = {
  monday: { open: true, slots: [["00:00", "23:59"]] },
  tuesday: { open: true, slots: [["00:00", "23:59"]] },
  wednesday: { open: true, slots: [["00:00", "23:59"]] },
  thursday: { open: true, slots: [["00:00", "23:59"]] },
  friday: { open: true, slots: [["00:00", "23:59"]] },
  saturday: { open: true, slots: [["00:00", "23:59"]] },
  sunday: { open: true, slots: [["00:00", "23:59"]] },
};

// Fully closed schedule so `isOpenNow` always returns false.
const ALWAYS_CLOSED = {
  monday: { open: false, slots: [] },
  tuesday: { open: false, slots: [] },
  wednesday: { open: false, slots: [] },
  thursday: { open: false, slots: [] },
  friday: { open: false, slots: [] },
  saturday: { open: false, slots: [] },
  sunday: { open: false, slots: [] },
};

describe("rankPickupPoints", () => {
  it("returns an empty map when given no points", () => {
    const map = rankPickupPoints([], ORIGIN, NOW);
    expect(map.size).toBe(0);
  });

  it("returns an empty map when all points are overridden-closed", () => {
    const closedOverride = [
      {
        id: "override-1",
        starts_at: "2026-04-01T00:00:00Z",
        ends_at: "2026-12-31T00:00:00Z",
        reason: null,
      },
    ];
    const points = [
      point({ id: "a", latitude: 0, longitude: 0 }, closedOverride),
      point({ id: "b", latitude: 0.5, longitude: 0 }, closedOverride),
    ];
    const map = rankPickupPoints(points, ORIGIN, NOW);
    expect(map.size).toBe(0);
  });

  it("tags the closest open point as 'best' when a reference is provided", () => {
    const points = [
      point({ id: "far", latitude: 1, longitude: 0 }),
      point({ id: "near", latitude: 0.01, longitude: 0 }),
      point({ id: "mid", latitude: 0.5, longitude: 0 }),
    ];
    const map = rankPickupPoints(points, ORIGIN, NOW);
    expect(map.get("near")).toBe("best");
  });

  it("tags the overall-closest as 'closest' when it is not open", () => {
    const points = [
      point({ id: "closest-closed", latitude: 0.01, longitude: 0, working_hours: ALWAYS_CLOSED }),
      point({ id: "next-open", latitude: 0.5, longitude: 0 }),
    ];
    const map = rankPickupPoints(points, ORIGIN, NOW);
    expect(map.get("closest-closed")).toBe("closest");
    expect(map.get("next-open")).toBe("best");
  });

  it("never tags the same point twice (best wins over closest)", () => {
    // A single open point that is also the overall closest — should only get
    // "best", never also "closest".
    const points = [
      point({ id: "only", latitude: 0.01, longitude: 0 }),
      point({ id: "further", latitude: 0.5, longitude: 0, working_hours: ALWAYS_CLOSED }),
    ];
    const map = rankPickupPoints(points, ORIGIN, NOW);
    expect(map.get("only")).toBe("best");
    expect(map.get("further")).toBeUndefined();
  });

  it("falls back to tagging the first open point as 'openNow' without a reference", () => {
    const points = [
      point({ id: "closed", latitude: 0, longitude: 0, working_hours: ALWAYS_CLOSED }),
      point({ id: "open", latitude: 0, longitude: 0 }),
    ];
    const map = rankPickupPoints(points, null, NOW);
    expect(map.get("open")).toBe("openNow");
    expect(map.get("closed")).toBeUndefined();
  });

  it("returns an empty map when no reference and no open points exist", () => {
    const points = [
      point({ id: "a", latitude: 0, longitude: 0, working_hours: ALWAYS_CLOSED }),
      point({ id: "b", latitude: 1, longitude: 0, working_hours: ALWAYS_CLOSED }),
    ];
    const map = rankPickupPoints(points, null, NOW);
    expect(map.size).toBe(0);
  });

  it("skips overridden-closed points when choosing 'best' / 'closest'", () => {
    const closedOverride = [
      {
        id: "override-1",
        starts_at: "2026-04-01T00:00:00Z",
        ends_at: "2026-12-31T00:00:00Z",
        reason: null,
      },
    ];
    const points = [
      point({ id: "overridden-nearest", latitude: 0.01, longitude: 0 }, closedOverride),
      point({ id: "real-nearest", latitude: 0.5, longitude: 0 }),
    ];
    const map = rankPickupPoints(points, ORIGIN, NOW);
    // The overridden point wins on distance but is filtered out, so the next
    // one becomes "best".
    expect(map.get("real-nearest")).toBe("best");
    expect(map.get("overridden-nearest")).toBeUndefined();
  });
});
