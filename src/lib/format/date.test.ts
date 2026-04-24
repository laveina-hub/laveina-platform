import { describe, expect, it } from "vitest";

import {
  formatDateLong,
  formatDateMedium,
  formatDateShort,
  formatDateTime,
  formatDateTimeMedium,
  formatRelative,
  formatTime,
} from "./date";

// Fixed date so assertions are stable across runs / timezones.
const APR_20_2026_NOON_UTC = "2026-04-20T12:00:00Z";

describe("formatDateShort", () => {
  it("renders DD/MM/YYYY in Spanish", () => {
    // Assertion avoids hardcoding the viewer's timezone by extracting digits.
    const out = formatDateShort(APR_20_2026_NOON_UTC, "es");
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(out).toContain("2026");
  });

  it("renders DD/MM/YYYY in Catalan", () => {
    expect(formatDateShort(APR_20_2026_NOON_UTC, "ca")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("renders DD/MM/YYYY in English (en-GB style)", () => {
    // Q18.2 — assert day leads. US format would produce 04/20/2026, so the
    // first 2 digits being "20" (not "04") locks in DD/MM ordering.
    const out = formatDateShort(APR_20_2026_NOON_UTC, "en");
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(out.startsWith("20/")).toBe(true);
  });

  it("accepts a Date instance", () => {
    const d = new Date(APR_20_2026_NOON_UTC);
    expect(formatDateShort(d, "es")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("formatDateLong", () => {
  it("includes the full month name in Spanish", () => {
    const out = formatDateLong(APR_20_2026_NOON_UTC, "es").toLowerCase();
    expect(out).toContain("abril");
    expect(out).toContain("2026");
  });

  it("includes the full month name in Catalan", () => {
    const out = formatDateLong(APR_20_2026_NOON_UTC, "ca").toLowerCase();
    expect(out).toContain("abril");
  });

  it("includes the full month name in English", () => {
    const out = formatDateLong(APR_20_2026_NOON_UTC, "en").toLowerCase();
    expect(out).toContain("april");
  });
});

describe("formatDateTime", () => {
  it("includes both date and time components", () => {
    const out = formatDateTime(APR_20_2026_NOON_UTC, "es", { timeZone: "Europe/Madrid" });
    // Madrid in April is UTC+2 (DST) → 14:00 wall-clock.
    expect(out).toContain("14:00");
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("renders 24-hour time (no AM/PM) regardless of locale", () => {
    const out = formatDateTime(APR_20_2026_NOON_UTC, "en", { timeZone: "Europe/Madrid" });
    expect(out.toLowerCase()).not.toContain("pm");
    expect(out.toLowerCase()).not.toContain("am");
  });
});

describe("formatTime", () => {
  it("renders HH:mm in the configured timezone", () => {
    expect(formatTime(APR_20_2026_NOON_UTC, "es", { timeZone: "Europe/Madrid" })).toBe("14:00");
  });
});

describe("formatRelative", () => {
  const NOW = new Date("2026-04-20T12:00:00Z");

  it('uses seconds for "just now"-ish diffs', () => {
    const out = formatRelative(new Date(NOW.getTime() - 10_000), "en", NOW);
    expect(out.toLowerCase()).toMatch(/second/);
  });

  it("uses minutes for a minute-scale diff", () => {
    const out = formatRelative(new Date(NOW.getTime() - 5 * 60_000), "en", NOW);
    expect(out.toLowerCase()).toMatch(/minute/);
  });

  it("uses hours for an hour-scale diff", () => {
    const out = formatRelative(new Date(NOW.getTime() - 3 * 3_600_000), "en", NOW);
    expect(out.toLowerCase()).toMatch(/hour/);
  });

  it("uses days for a day-scale diff", () => {
    const out = formatRelative(new Date(NOW.getTime() - 2 * 86_400_000), "en", NOW);
    expect(out.toLowerCase()).toMatch(/day/);
  });

  it("localises to Spanish", () => {
    const out = formatRelative(new Date(NOW.getTime() - 3 * 3_600_000), "es", NOW);
    expect(out.toLowerCase()).toMatch(/hora/);
  });
});

describe("formatDateMedium", () => {
  it("renders day + short-month + year in Spanish", () => {
    const out = formatDateMedium(APR_20_2026_NOON_UTC, "es");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/abr/i);
  });

  it("renders day + short-month + year in English", () => {
    const out = formatDateMedium(APR_20_2026_NOON_UTC, "en");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/apr/i);
  });
});

describe("formatDateTimeMedium", () => {
  it("includes both the date and the 24h time", () => {
    const out = formatDateTimeMedium(APR_20_2026_NOON_UTC, "es", { timeZone: "UTC" });
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/12:00/);
  });

  it("respects the requested timezone", () => {
    // Madrid in April is UTC+2; noon UTC → 14:00 local.
    const out = formatDateTimeMedium(APR_20_2026_NOON_UTC, "es", {
      timeZone: "Europe/Madrid",
    });
    expect(out).toMatch(/14:00/);
  });
});
