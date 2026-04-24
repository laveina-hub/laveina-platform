// Shared types, reducer, and fetch helpers for the admin settings form —
// imported by the main coordinator and each sub-editor.

export type InsuranceOption = {
  id: string;
  coverage_amount_cents: number;
  surcharge_cents: number;
  is_active: boolean;
  display_order: number;
};

export type ParcelSizeConfig = {
  size: string;
  min_weight_kg: number;
  max_weight_kg: number;
  is_active: boolean;
};

export type SettingsData = {
  settings: Record<string, string>;
  insuranceOptions: InsuranceOption[];
  parcelSizes: ParcelSizeConfig[];
};

// M2 pricing is keyed by preset × speed and persisted as
// `bcn_price_{preset}_{speed}_cents`. The 4 presets × 3 speeds = 12 keys,
// all seeded by the initial migration.
export type PresetSlug = "mini" | "small" | "medium" | "large";
export type SpeedSlug = "standard" | "express" | "next_day";
export const PRESET_SLUGS: readonly PresetSlug[] = ["mini", "small", "medium", "large"];
export const SPEED_SLUGS: readonly SpeedSlug[] = ["standard", "express", "next_day"];

export type BarcelonaPrices = Record<PresetSlug, Record<SpeedSlug, string>>;

export type FormState = {
  carrierMargin: string;
  minimumPrice: string;
  barcelonaPrices: BarcelonaPrices;
  insurance: InsuranceOption[];
  initialized: boolean;
};

export type FormAction =
  | { type: "INIT_FROM_DATA"; data: SettingsData }
  | { type: "SET_CARRIER_MARGIN"; value: string }
  | { type: "SET_MINIMUM_PRICE"; value: string }
  | { type: "SET_BARCELONA_PRICE"; preset: PresetSlug; speed: SpeedSlug; value: string }
  | { type: "SET_INSURANCE_SURCHARGE"; index: number; surcharge_cents: number }
  | { type: "SET_INSURANCE_ACTIVE"; index: number; is_active: boolean };

export function emptyBarcelonaPrices(): BarcelonaPrices {
  // SAFETY: object literal is filled below with every PresetSlug key; the
  // `as BarcelonaPrices` cast is a starter for the loop — TypeScript can't
  // track field-by-field completion.
  const out = {} as BarcelonaPrices;
  for (const preset of PRESET_SLUGS) {
    out[preset] = { standard: "", express: "", next_day: "" };
  }
  return out;
}

export const initialFormState: FormState = {
  carrierMargin: "25",
  minimumPrice: "4.00",
  barcelonaPrices: emptyBarcelonaPrices(),
  insurance: [],
  initialized: false,
};

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "INIT_FROM_DATA": {
      const prices = emptyBarcelonaPrices();
      for (const preset of PRESET_SLUGS) {
        for (const speed of SPEED_SLUGS) {
          const cents = action.data.settings[`bcn_price_${preset}_${speed}_cents`];
          prices[preset][speed] = cents ? (Number(cents) / 100).toFixed(2) : "";
        }
      }
      return {
        carrierMargin: action.data.settings.sendcloud_margin_percent ?? "25",
        minimumPrice: action.data.settings.minimum_price_eur ?? "4.00",
        barcelonaPrices: prices,
        insurance: action.data.insuranceOptions,
        initialized: true,
      };
    }
    case "SET_CARRIER_MARGIN":
      return { ...state, carrierMargin: action.value };
    case "SET_MINIMUM_PRICE":
      return { ...state, minimumPrice: action.value };
    case "SET_BARCELONA_PRICE":
      return {
        ...state,
        barcelonaPrices: {
          ...state.barcelonaPrices,
          [action.preset]: {
            ...state.barcelonaPrices[action.preset],
            [action.speed]: action.value,
          },
        },
      };
    case "SET_INSURANCE_SURCHARGE": {
      const ins = [...state.insurance];
      ins[action.index] = { ...ins[action.index], surcharge_cents: action.surcharge_cents };
      return { ...state, insurance: ins };
    }
    case "SET_INSURANCE_ACTIVE": {
      const ins = [...state.insurance];
      ins[action.index] = { ...ins[action.index], is_active: action.is_active };
      return { ...state, insurance: ins };
    }
    default:
      return state;
  }
}

export async function fetchSettings(): Promise<SettingsData> {
  const response = await fetch("/api/admin/settings");
  if (!response.ok) throw new Error("Failed to fetch settings");
  const result = await response.json();
  return result.data;
}

export async function saveSettings(data: {
  settings: Record<string, string>;
  insuranceOptions: InsuranceOption[];
}): Promise<void> {
  const response = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to save settings");
}
