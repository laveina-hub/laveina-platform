"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useReducer } from "react";
import { toast } from "sonner";

import { Button, Input, Label } from "@/components/atoms";

import {
  PRESET_SLUGS,
  SPEED_SLUGS,
  fetchSettings,
  formReducer,
  initialFormState,
  saveSettings,
} from "./admin-settings.data";
import { BcnPricingEditor } from "./BcnPricingEditor";
import { InsuranceOptionsEditor } from "./InsuranceOptionsEditor";

/**
 * Platform settings coordinator. Owns the form state and Save cycle; the
 * Barcelona pricing matrix and insurance tier editor each render from their
 * own sub-component against a shared reducer.
 */
export function AdminSettingsSection() {
  const t = useTranslations("adminSettings");
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(formReducer, initialFormState);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchSettings,
  });

  // Only initialize on first load to avoid overwriting user edits.
  if (data && !form.initialized) {
    dispatch({ type: "INIT_FROM_DATA", data });
  }

  const mutation = useMutation({
    mutationFn: () => {
      const settingsPayload: Record<string, string> = {
        sendcloud_margin_percent: form.carrierMargin,
        minimum_price_eur: form.minimumPrice,
      };

      for (const preset of PRESET_SLUGS) {
        for (const speed of SPEED_SLUGS) {
          const raw = form.barcelonaPrices[preset][speed];
          const cents = Math.round(parseFloat(raw || "0") * 100);
          settingsPayload[`bcn_price_${preset}_${speed}_cents`] = String(cents);
        }
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

        <BcnPricingEditor prices={form.barcelonaPrices} dispatch={dispatch} />

        <InsuranceOptionsEditor insurance={form.insurance} dispatch={dispatch} />

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
      <div className="skeleton-shimmer h-8 w-64 rounded" />
      <div className="max-w-3xl space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border-default bg-secondary-50 skeleton-shimmer h-48 rounded-xl border"
          />
        ))}
      </div>
    </div>
  );
}
