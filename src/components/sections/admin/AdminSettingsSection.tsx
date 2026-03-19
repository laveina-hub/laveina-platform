"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useReducer } from "react";
import { toast } from "sonner";

import { Button, Input, Label } from "@/components/atoms";

type InsuranceOption = {
  id: string;
  coverage_amount_cents: number;
  surcharge_cents: number;
  is_active: boolean;
  display_order: number;
};

type ParcelSizeConfig = {
  id: string;
  size: string;
  max_weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  is_active: boolean;
};

type SettingsData = {
  settings: Record<string, string>;
  insuranceOptions: InsuranceOption[];
  parcelSizes: ParcelSizeConfig[];
};

// ─── Form state managed atomically via useReducer ────────────────────────────

type FormState = {
  carrierMargin: string;
  minimumPrice: string;
  barcelonaPrices: Record<string, { standard: string; express: string }>;
  insurance: InsuranceOption[];
  initialized: boolean;
};

type FormAction =
  | { type: "INIT_FROM_DATA"; data: SettingsData }
  | { type: "SET_CARRIER_MARGIN"; value: string }
  | { type: "SET_MINIMUM_PRICE"; value: string }
  | { type: "SET_BARCELONA_PRICE"; size: string; speed: "standard" | "express"; value: string }
  | { type: "SET_INSURANCE_SURCHARGE"; index: number; surcharge_cents: number }
  | { type: "SET_INSURANCE_ACTIVE"; index: number; is_active: boolean };

const initialFormState: FormState = {
  carrierMargin: "25",
  minimumPrice: "4.00",
  barcelonaPrices: {},
  insurance: [],
  initialized: false,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "INIT_FROM_DATA": {
      const prices: Record<string, { standard: string; express: string }> = {};
      for (const size of action.data.parcelSizes) {
        prices[size.size] = {
          standard: action.data.settings[`barcelona_${size.size}_standard`] ?? "",
          express: action.data.settings[`barcelona_${size.size}_express`] ?? "",
        };
      }
      return {
        carrierMargin: action.data.settings.carrier_margin_percent ?? "25",
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
          [action.size]: {
            ...state.barcelonaPrices[action.size],
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

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchSettings(): Promise<SettingsData> {
  const response = await fetch("/api/admin/settings");
  if (!response.ok) throw new Error("Failed to fetch settings");
  const result = await response.json();
  return result.data;
}

async function saveSettings(data: {
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

const PARCEL_SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  extra_large: "Extra Large",
  xxl: "XXL",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminSettingsSection() {
  const t = useTranslations("adminSettings");
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(formReducer, initialFormState);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchSettings,
  });

  // Initialize form state once when data arrives — only on first load
  if (data && !form.initialized) {
    dispatch({ type: "INIT_FROM_DATA", data });
  }

  const mutation = useMutation({
    mutationFn: () => {
      const settingsPayload: Record<string, string> = {
        carrier_margin_percent: form.carrierMargin,
        minimum_price_eur: form.minimumPrice,
      };

      for (const [size, prices] of Object.entries(form.barcelonaPrices)) {
        settingsPayload[`barcelona_${size}_standard`] = prices.standard;
        settingsPayload[`barcelona_${size}_express`] = prices.express;
      }

      return saveSettings({
        settings: settingsPayload,
        insuranceOptions: form.insurance,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success(t("saved"));
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

  if (isLoading || !data) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Carrier settings */}
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">{t("carrierSettings")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">{t("carrierMargin")}</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.carrierMargin}
                onChange={(e) => dispatch({ type: "SET_CARRIER_MARGIN", value: e.target.value })}
                className="py-2 text-sm"
              />
              <p className="text-xs text-gray-500">{t("carrierMarginDesc")}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">{t("minimumPrice")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.minimumPrice}
                onChange={(e) => dispatch({ type: "SET_MINIMUM_PRICE", value: e.target.value })}
                className="py-2 text-sm"
              />
              <p className="text-xs text-gray-500">{t("minimumPriceDesc")}</p>
            </div>
          </div>
        </section>

        {/* Barcelona pricing */}
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("barcelonaPricing")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("barcelonaPricingDesc")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-2 pr-4">{t("size")}</th>
                  <th className="py-2 pr-4">{t("maxWeight")}</th>
                  <th className="py-2 pr-4">{t("standardPrice")}</th>
                  <th className="py-2">{t("expressPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {data.parcelSizes.map((size) => (
                  <tr key={size.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {PARCEL_SIZE_LABELS[size.size] ?? size.size}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{size.max_weight_kg} kg</td>
                    <td className="py-2 pr-4">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.barcelonaPrices[size.size]?.standard ?? ""}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_BARCELONA_PRICE",
                            size: size.size,
                            speed: "standard",
                            value: e.target.value,
                          })
                        }
                        className="w-28 py-1.5 text-sm"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.barcelonaPrices[size.size]?.express ?? ""}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_BARCELONA_PRICE",
                            size: size.size,
                            speed: "express",
                            value: e.target.value,
                          })
                        }
                        className="w-28 py-1.5 text-sm"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Insurance options */}
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("insuranceOptions")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("insuranceDesc")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-2 pr-4">{t("coverage")}</th>
                  <th className="py-2 pr-4">{t("surcharge")}</th>
                  <th className="py-2">{t("isActive")}</th>
                </tr>
              </thead>
              <tbody>
                {form.insurance.map((opt, i) => (
                  <tr key={opt.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {(opt.coverage_amount_cents / 100).toFixed(0)}
                    </td>
                    <td className="py-2 pr-4">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(opt.surcharge_cents / 100).toFixed(2)}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_INSURANCE_SURCHARGE",
                            index: i,
                            surcharge_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                          })
                        }
                        className="w-24 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={opt.is_active}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_INSURANCE_ACTIVE",
                            index: i,
                            is_active: e.target.checked,
                          })
                        }
                        className="text-primary-500 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
      <div className="max-w-3xl space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}
