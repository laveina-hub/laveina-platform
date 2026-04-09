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
  size: string;
  min_weight_kg: number;
  max_weight_kg: number;
  is_active: boolean;
};

type SettingsData = {
  settings: Record<string, string>;
  insuranceOptions: InsuranceOption[];
  parcelSizes: ParcelSizeConfig[];
};

type FormState = {
  carrierMargin: string;
  minimumPrice: string;
  barcelonaPrices: Record<string, { standard: string }>;
  insurance: InsuranceOption[];
  initialized: boolean;
};

type FormAction =
  | { type: "INIT_FROM_DATA"; data: SettingsData }
  | { type: "SET_CARRIER_MARGIN"; value: string }
  | { type: "SET_MINIMUM_PRICE"; value: string }
  | { type: "SET_BARCELONA_PRICE"; size: string; value: string }
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
      const prices: Record<string, { standard: string }> = {};
      for (const size of action.data.parcelSizes) {
        const stdCents = action.data.settings[`internal_price_${size.size}_cents`];
        prices[size.size] = {
          standard: stdCents ? (Number(stdCents) / 100).toFixed(2) : "",
        };
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
          [action.size]: { standard: action.value },
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

export function AdminSettingsSection() {
  const t = useTranslations("adminSettings");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(formReducer, initialFormState);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchSettings,
  });

  // Only initialize on first load to avoid overwriting user edits
  if (data && !form.initialized) {
    dispatch({ type: "INIT_FROM_DATA", data });
  }

  const mutation = useMutation({
    mutationFn: () => {
      const settingsPayload: Record<string, string> = {
        sendcloud_margin_percent: form.carrierMargin,
        minimum_price_eur: form.minimumPrice,
      };

      for (const [size, prices] of Object.entries(form.barcelonaPrices)) {
        const stdCents = Math.round(parseFloat(prices.standard || "0") * 100);
        settingsPayload[`internal_price_${size}_cents`] = String(stdCents);
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
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <section className="border-border-default space-y-4 rounded-xl border bg-white p-5">
          <h2 className="text-text-primary text-base font-semibold">{t("carrierSettings")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-text-primary text-sm font-medium">{t("carrierMargin")}</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.carrierMargin}
                onChange={(e) => dispatch({ type: "SET_CARRIER_MARGIN", value: e.target.value })}
                className="py-2 text-sm"
              />
              <p className="text-text-muted text-xs">{t("carrierMarginDesc")}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-text-primary text-sm font-medium">{t("minimumPrice")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.minimumPrice}
                onChange={(e) => dispatch({ type: "SET_MINIMUM_PRICE", value: e.target.value })}
                className="py-2 text-sm"
              />
              <p className="text-text-muted text-xs">{t("minimumPriceDesc")}</p>
            </div>
          </div>
        </section>

        <section className="border-border-default space-y-4 rounded-xl border bg-white p-5">
          <div>
            <h2 className="text-text-primary text-base font-semibold">{t("barcelonaPricing")}</h2>
            <p className="text-text-muted mt-1 text-xs">{t("barcelonaPricingDesc")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border-default text-text-muted border-b text-left text-xs font-semibold uppercase">
                  <th className="py-2 pr-4">{t("size")}</th>
                  <th className="py-2 pr-4">{t("weightRange")}</th>
                  <th className="py-2">{t("standardPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {data.parcelSizes.map((size) => (
                  <tr key={size.size} className="border-border-default border-b">
                    <td className="text-text-primary py-2 pr-4 font-medium">
                      {tCommon(`parcelSizeLabel.${size.size}` as Parameters<typeof tCommon>[0])}
                    </td>
                    <td className="text-text-muted py-2 pr-4">
                      {size.min_weight_kg}–{size.max_weight_kg} kg
                    </td>
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

        <section className="border-border-default space-y-4 rounded-xl border bg-white p-5">
          <div>
            <h2 className="text-text-primary text-base font-semibold">{t("insuranceOptions")}</h2>
            <p className="text-text-muted mt-1 text-xs">{t("insuranceDesc")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border-default text-text-muted border-b text-left text-xs font-semibold uppercase">
                  <th className="py-2 pr-4">{t("coverage")}</th>
                  <th className="py-2 pr-4">{t("surcharge")}</th>
                  <th className="py-2">{t("isActive")}</th>
                </tr>
              </thead>
              <tbody>
                {form.insurance.map((opt, i) => (
                  <tr key={opt.id} className="border-border-default border-b">
                    <td className="text-text-primary py-2 pr-4 font-medium">
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
                        className="text-primary-500 focus:ring-primary-500 border-border-default h-4 w-4 rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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
      <div className="bg-secondary-100 h-8 w-64 animate-pulse rounded" />
      <div className="max-w-3xl space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border-default bg-secondary-50 h-48 animate-pulse rounded-xl border"
          />
        ))}
      </div>
    </div>
  );
}
