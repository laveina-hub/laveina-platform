import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ParcelPreset } from "@/constants/parcel-sizes";
import { MAX_PARCELS_PER_BOOKING, useBookingStore } from "@/hooks/use-booking-store";

import { Step1Size } from "./Step1Size";

// Stub next-intl: echo the key (or the provided `name` param for aria-labels)
// so the tests assert behavior without coupling to locale strings. The real
// locale-parity check lives in src/i18n/messages.test.ts.
vi.mock("next-intl", () => {
  function format(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
  }
  return {
    useTranslations: () => {
      const fn = (key: string, values?: Record<string, unknown>) => {
        if (!values) return key;
        if ("name" in values && typeof values.name === "string") {
          return `${key}:${values.name}`;
        }
        if ("index" in values) return `${key}:${format(values.index)}`;
        if ("count" in values) return `${key}:${format(values.count)}`;
        return key;
      };
      return fn;
    },
  };
});

const PRESETS: ParcelPreset[] = [
  {
    slug: "mini",
    nameKey: "mini",
    exampleKey: "mini.example",
    minWeightKg: 0,
    maxWeightKg: 2,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 10,
    displayOrder: 1,
    isActive: true,
  },
  {
    slug: "small",
    nameKey: "small",
    exampleKey: "small.example",
    minWeightKg: 2,
    maxWeightKg: 5,
    lengthCm: 35,
    widthCm: 25,
    heightCm: 20,
    displayOrder: 2,
    isActive: true,
  },
  {
    slug: "medium",
    nameKey: "medium",
    exampleKey: "medium.example",
    minWeightKg: 5,
    maxWeightKg: 10,
    lengthCm: 40,
    widthCm: 40,
    heightCm: 37,
    displayOrder: 3,
    isActive: true,
  },
  {
    slug: "large",
    nameKey: "large",
    exampleKey: "large.example",
    minWeightKg: 10,
    maxWeightKg: 20,
    lengthCm: 55,
    widthCm: 55,
    heightCm: 39,
    displayOrder: 4,
    isActive: true,
  },
];

const BCN_PRICES = {
  mini: { standard: 395, express: 495, next_day: 595 },
  small: { standard: 495, express: 595, next_day: 695 },
  medium: { standard: 595, express: 695, next_day: 795 },
  large: { standard: 795, express: 895, next_day: 995 },
} as const;

function renderStep1() {
  return render(<Step1Size presets={PRESETS} bcnPrices={BCN_PRICES} />);
}

function clickPresetAddButton(slug: "mini" | "small" | "medium" | "large") {
  // The stub translator returns keys verbatim, so tPresets("<slug>.name")
  // yields "<slug>.name" which is interpolated into the aria-label.
  const btn = screen.getByRole("button", {
    name: `multiparcelAddPresetAria:${slug}.name`,
  });
  fireEvent.click(btn);
}

function fillCustomDraft(values: {
  length: string;
  width: string;
  height: string;
  weight: string;
}) {
  fireEvent.change(screen.getByLabelText("customSizeLength"), { target: { value: values.length } });
  fireEvent.change(screen.getByLabelText("customSizeWidth"), { target: { value: values.width } });
  fireEvent.change(screen.getByLabelText("customSizeHeight"), { target: { value: values.height } });
  fireEvent.change(screen.getByLabelText("customSizeWeight"), { target: { value: values.weight } });
}

function openCustomAccordion() {
  const toggle = screen.getByRole("button", { name: /customSizeToggle/ });
  fireEvent.click(toggle);
}

describe("Step1Size — unified parcel list", () => {
  beforeEach(() => {
    act(() => {
      useBookingStore.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useBookingStore.getState().reset();
    });
  });

  it("starts empty, Next disabled, shows empty hint", () => {
    renderStep1();
    expect(useBookingStore.getState().parcels).toEqual([]);
    expect(screen.getByRole("button", { name: /^next$/ })).toBeDisabled();
    expect(screen.getByText("multiparcelEmptyHint")).toBeInTheDocument();
  });

  it("adds a preset parcel when a card is clicked", () => {
    renderStep1();
    clickPresetAddButton("small");
    const parcels = useBookingStore.getState().parcels;
    expect(parcels).toHaveLength(1);
    expect(parcels[0]).toMatchObject({ preset_slug: "small", weight_kg: 5 });
  });

  it("adds multiple preset parcels (same or different sizes)", () => {
    renderStep1();
    clickPresetAddButton("small");
    clickPresetAddButton("large");
    clickPresetAddButton("small");
    const parcels = useBookingStore.getState().parcels;
    expect(parcels.map((p) => p.preset_slug)).toEqual(["small", "large", "small"]);
    expect(screen.getByText("multiparcelSendingN:3")).toBeInTheDocument();
  });

  it("adds a custom-size parcel via the accordion", () => {
    renderStep1();
    openCustomAccordion();
    fillCustomDraft({ length: "40", width: "30", height: "20", weight: "3" });
    fireEvent.click(screen.getByRole("button", { name: /multiparcelAddCustomCta/ }));

    const parcels = useBookingStore.getState().parcels;
    expect(parcels).toHaveLength(1);
    expect(parcels[0]).toMatchObject({
      preset_slug: null,
      length_cm: 40,
      width_cm: 30,
      height_cm: 20,
      weight_kg: 3,
    });
  });

  it("rejects a custom parcel whose longest side exceeds the cap", () => {
    renderStep1();
    openCustomAccordion();
    // 60 cm longest > 55 cm cap
    fillCustomDraft({ length: "60", width: "30", height: "20", weight: "3" });
    fireEvent.click(screen.getByRole("button", { name: /multiparcelAddCustomCta/ }));

    expect(useBookingStore.getState().parcels).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent("longestSideExceeded");
  });

  it("rejects a custom parcel with empty fields and surfaces the error", () => {
    renderStep1();
    openCustomAccordion();
    fireEvent.click(screen.getByRole("button", { name: /multiparcelAddCustomCta/ }));

    expect(useBookingStore.getState().parcels).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent("dimensionRequired");
  });

  it("caps adds at MAX_PARCELS_PER_BOOKING and disables the preset buttons", () => {
    renderStep1();
    for (let i = 0; i < MAX_PARCELS_PER_BOOKING; i++) {
      clickPresetAddButton("mini");
    }
    expect(useBookingStore.getState().parcels).toHaveLength(MAX_PARCELS_PER_BOOKING);

    // Card button disabled once cap is hit.
    expect(
      screen.getByRole("button", { name: "multiparcelAddPresetAria:mini.name" })
    ).toBeDisabled();

    // Extra click is a no-op.
    clickPresetAddButton("mini");
    expect(useBookingStore.getState().parcels).toHaveLength(MAX_PARCELS_PER_BOOKING);
  });

  it("mixes presets and custom sizes in the same list", () => {
    renderStep1();
    clickPresetAddButton("small");
    openCustomAccordion();
    fillCustomDraft({ length: "30", width: "20", height: "15", weight: "1.5" });
    fireEvent.click(screen.getByRole("button", { name: /multiparcelAddCustomCta/ }));
    clickPresetAddButton("large");

    const slugs = useBookingStore.getState().parcels.map((p) => p.preset_slug);
    expect(slugs).toEqual(["small", null, "large"]);
  });

  it("removes a parcel from the unified list", () => {
    renderStep1();
    clickPresetAddButton("small");
    clickPresetAddButton("large");
    expect(useBookingStore.getState().parcels).toHaveLength(2);

    // Remove the first parcel via its row's remove button. The aria-label is
    // "multiparcelRemove:1" (we echo the index through the test translator).
    const removeBtn = screen.getByRole("button", { name: "multiparcelRemove:1" });
    fireEvent.click(removeBtn);

    const parcels = useBookingStore.getState().parcels;
    expect(parcels).toHaveLength(1);
    expect(parcels[0].preset_slug).toBe("large");
  });

  it("enables Next once at least one parcel exists", () => {
    renderStep1();
    expect(screen.getByRole("button", { name: /^next$/ })).toBeDisabled();

    clickPresetAddButton("mini");
    expect(screen.getByRole("button", { name: /^next$/ })).not.toBeDisabled();
  });

  it("advances the wizard to step 2 on Next", () => {
    renderStep1();
    clickPresetAddButton("mini");

    fireEvent.click(screen.getByRole("button", { name: /^next$/ }));
    expect(useBookingStore.getState().currentStep).toBe(2);
  });

  it("converts a preset row to custom via the row dropdown and preserves dims", () => {
    renderStep1();
    clickPresetAddButton("small");
    expect(useBookingStore.getState().parcels[0].preset_slug).toBe("small");

    // Each row has its own size <select>; switch it to "custom".
    const rowSelect = screen.getByLabelText("multiparcelChangeSize") as HTMLSelectElement;
    fireEvent.change(rowSelect, { target: { value: "custom" } });

    const first = useBookingStore.getState().parcels[0];
    expect(first.preset_slug).toBeNull();
    // Seeded from the "small" preset (35 × 25 × 20, max 5 kg).
    expect(first.length_cm).toBe(35);
    expect(first.width_cm).toBe(25);
    expect(first.height_cm).toBe(20);
    expect(first.weight_kg).toBe(5);

    // Edit form opens automatically; find its Done button by scoping to the row.
    const row = rowSelect.closest("li") as HTMLElement;
    const done = within(row).getByRole("button", { name: /multiparcelCustomDone/ });
    expect(done).toBeInTheDocument();
  });
});
