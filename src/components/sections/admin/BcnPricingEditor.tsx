"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/atoms";
import { DEFAULT_PARCEL_PRESETS } from "@/constants/parcel-preset-defaults";

import {
  SPEED_SLUGS,
  type BarcelonaPrices,
  type FormAction,
  type PresetSlug,
} from "./admin-settings.data";

type BcnPricingEditorProps = {
  prices: BarcelonaPrices;
  dispatch: (action: FormAction) => void;
};

/**
 * Barcelona-internal pricing editor (4 presets × 3 speeds). Reads and writes
 * `bcn_price_{preset}_{speed}_cents` via the parent's reducer. Weight ranges
 * come from `DEFAULT_PARCEL_PRESETS` (the seed shadow).
 */
export function BcnPricingEditor({ prices, dispatch }: BcnPricingEditorProps) {
  const t = useTranslations("adminSettings");
  const tPresets = useTranslations("parcelPresets");

  return (
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
              <th className="py-2 pr-4">{t("standardPrice")}</th>
              <th className="py-2 pr-4">{t("expressPrice")}</th>
              <th className="py-2">{t("nextDayPrice")}</th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_PARCEL_PRESETS.map((preset) => {
              // SAFETY: DEFAULT_PARCEL_PRESETS is the canonical preset seed
              // and its slugs are exactly the PresetSlug union.
              const slug = preset.slug as PresetSlug;
              return (
                <tr key={slug} className="border-border-default border-b">
                  <td className="text-text-primary py-2 pr-4 font-medium">
                    {tPresets(`${slug}.name`)}
                  </td>
                  <td className="text-text-muted py-2 pr-4">
                    {preset.minWeightKg}–{preset.maxWeightKg} kg
                  </td>
                  {SPEED_SLUGS.map((speed) => (
                    <td key={speed} className="py-2 pr-4">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={prices[slug][speed]}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_BARCELONA_PRICE",
                            preset: slug,
                            speed,
                            value: e.target.value,
                          })
                        }
                        className="w-24 py-1.5 text-sm"
                        placeholder="0.00"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
