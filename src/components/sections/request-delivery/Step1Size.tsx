"use client";

import { useTranslations } from "next-intl";
import { useState, type ComponentType } from "react";

import { Button, Input, Label } from "@/components/atoms";
import {
  BoxIcon,
  BriefcaseIcon,
  ChevronIcon,
  FootprintsIcon,
  PlusIcon,
  WeightIcon,
} from "@/components/icons";
import { ParcelRow } from "@/components/molecules";
import {
  MAX_LONGEST_SIDE_CM,
  MAX_TOTAL_DIMENSIONS_CM,
  MAX_WEIGHT_KG,
  type ParcelPreset,
  type ParcelPresetSlug,
  validateParcelDimensions,
} from "@/constants/parcel-sizes";
import { MAX_PARCELS_PER_BOOKING, useBookingStore } from "@/hooks/use-booking-store";
import { formatCents } from "@/lib/format";

// Step 1 — size only (unified parcel list, 2026-04-24):
//   - The preset grid and custom-size accordion are "quick add" controls;
//     each click/apply appends a new parcel to the store, capped at
//     MAX_PARCELS_PER_BOOKING (5).
//   - Every parcel (including the first) appears in the list below as an
//     editable ParcelRow — no implicit primary parcel held by the grid.
//   - ParcelRow supports both preset and custom sizes inline.

type BcnPricesCents = Record<
  ParcelPresetSlug,
  { standard: number; express: number; next_day: number }
>;

type Props = {
  presets: ParcelPreset[];
  bcnPrices: BcnPricesCents;
};

const ICON_BY_SLUG: Record<ParcelPresetSlug, ComponentType<{ className?: string }>> = {
  mini: BoxIcon,
  small: FootprintsIcon,
  medium: WeightIcon,
  large: BriefcaseIcon,
};

type CustomDraft = {
  length: string;
  width: string;
  height: string;
  weight: string;
};

const EMPTY_DRAFT: CustomDraft = { length: "", width: "", height: "", weight: "" };

export function Step1Size({ presets, bcnPrices }: Props) {
  const t = useTranslations("booking");
  const tPresets = useTranslations("parcelPresets");
  const tv = useTranslations("validation");
  const { parcels, addParcel, updateParcel, removeParcel, setStep } = useBookingStore();

  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomDraft>(EMPTY_DRAFT);
  // Error messages may need interpolation (e.g. the max limit) — keep the
  // key and values together so the render side can pass both to `tv()`.
  const [customError, setCustomError] = useState<{
    key: string;
    values?: Record<string, number>;
  } | null>(null);

  const canAddMore = parcels.length < MAX_PARCELS_PER_BOOKING;
  const hasParcels = parcels.length > 0;

  function handleAddPreset(slug: ParcelPresetSlug) {
    if (!canAddMore) return;
    const preset = presets.find((p) => p.slug === slug);
    if (!preset) return;
    addParcel({
      preset_slug: slug,
      weight_kg: preset.maxWeightKg,
      wants_insurance: false,
    });
  }

  function handleAddCustom() {
    if (!canAddMore) return;

    const length = Number(customDraft.length);
    const width = Number(customDraft.width);
    const height = Number(customDraft.height);
    const weight = Number(customDraft.weight);

    if (
      !Number.isFinite(length) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      !Number.isFinite(weight) ||
      length <= 0 ||
      width <= 0 ||
      height <= 0 ||
      weight <= 0
    ) {
      setCustomError({ key: "validation.dimensionRequired" });
      return;
    }

    if (weight > MAX_WEIGHT_KG) {
      setCustomError({ key: "validation.weightMax", values: { max: MAX_WEIGHT_KG } });
      return;
    }

    const dimResult = validateParcelDimensions(length, width, height);
    if (!dimResult.valid) {
      setCustomError({ key: dimResult.error, values: dimResult.values });
      return;
    }

    setCustomError(null);
    addParcel({
      preset_slug: null,
      length_cm: length,
      width_cm: width,
      height_cm: height,
      weight_kg: weight,
      wants_insurance: false,
    });
    setCustomDraft(EMPTY_DRAFT);
  }

  function handleContinue() {
    if (!hasParcels) return;
    setStep(2);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 sm:grid-cols-2">
        {presets.map((preset) => {
          const Icon = ICON_BY_SLUG[preset.slug] ?? BoxIcon;
          // Q5.6 — "From" always reflects the cheapest option (standard), not the
          // currently selected speed. The speed selector below the grid reveals
          // the actual cost for the chosen tier. Footnote explains the variance.
          const fromPriceCents = bcnPrices[preset.slug]?.standard;

          return (
            <div
              key={preset.slug}
              className="border-border-default relative flex flex-col items-center gap-3 rounded-xl border bg-white p-5 text-center"
            >
              <div className="bg-bg-muted text-text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                <Icon className="h-6 w-6" aria-hidden />
              </div>

              <h2 className="font-display text-text-primary text-xl leading-7.5">
                {t("presetTitle", {
                  name: tPresets(`${preset.slug}.name`),
                  category: tPresets(`${preset.slug}.category`),
                })}
              </h2>

              <div className="flex flex-col items-center gap-1">
                <p className="text-text-muted text-xs">{tPresets(`${preset.slug}.example`)}</p>
                <p className="text-text-muted text-base">
                  {t("weightRange", { min: preset.minWeightKg, max: preset.maxWeightKg })}
                </p>

                {fromPriceCents !== undefined && (
                  <p className="text-text-primary text-xl font-semibold">
                    {t("fromPrice", { price: formatCents(fromPriceCents) })}
                  </p>
                )}

                <p className="text-text-muted text-base">
                  {t("dimensionsLabel", {
                    length: preset.lengthCm,
                    width: preset.widthCm,
                    height: preset.heightCm,
                  })}
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleAddPreset(preset.slug)}
                disabled={!canAddMore}
                aria-label={t("multiparcelAddPresetAria", {
                  name: tPresets(`${preset.slug}.name`),
                })}
                className="mt-2"
              >
                <PlusIcon className="mr-1 h-4 w-4" />
                {t("multiparcelAddPresetCta")}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-text-muted -mt-4 text-xs italic">{t("fromPriceFootnote")}</p>

      <section
        aria-labelledby="custom-size-heading"
        className="border-border-default rounded-xl border bg-white transition-colors"
      >
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          aria-expanded={customOpen}
          aria-controls="custom-size-panel"
          className="focus-visible:ring-primary-500 flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <div className="flex flex-col">
            <h3 id="custom-size-heading" className="text-text-primary text-base font-semibold">
              {t("customSizeToggle")}
            </h3>
            <p className="text-text-muted text-xs">
              {t("customSizeHint", {
                maxLongest: MAX_LONGEST_SIDE_CM,
                maxTotal: MAX_TOTAL_DIMENSIONS_CM,
                maxWeight: MAX_WEIGHT_KG,
              })}
            </p>
          </div>
          <ChevronIcon direction={customOpen ? "up" : "down"} className="text-text-muted h-5 w-5" />
        </button>

        {customOpen && (
          <div id="custom-size-panel" className="px-5 pb-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor="custom-length" className="text-text-primary text-sm">
                  {t("customSizeLength")}
                </Label>
                <Input
                  id="custom-length"
                  type="number"
                  min={1}
                  max={MAX_LONGEST_SIDE_CM}
                  inputMode="numeric"
                  value={customDraft.length}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, length: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="custom-width" className="text-text-primary text-sm">
                  {t("customSizeWidth")}
                </Label>
                <Input
                  id="custom-width"
                  type="number"
                  min={1}
                  max={MAX_LONGEST_SIDE_CM}
                  inputMode="numeric"
                  value={customDraft.width}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, width: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="custom-height" className="text-text-primary text-sm">
                  {t("customSizeHeight")}
                </Label>
                <Input
                  id="custom-height"
                  type="number"
                  min={1}
                  max={MAX_LONGEST_SIDE_CM}
                  inputMode="numeric"
                  value={customDraft.height}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, height: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="custom-weight" className="text-text-primary text-sm">
                  {t("customSizeWeight")}
                </Label>
                <Input
                  id="custom-weight"
                  type="number"
                  min={0.1}
                  max={MAX_WEIGHT_KG}
                  step={0.1}
                  inputMode="decimal"
                  value={customDraft.weight}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, weight: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            {customError && (
              <p role="alert" className="text-error mt-2 text-xs">
                {tv(customError.key.replace("validation.", ""), customError.values)}
              </p>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAddCustom}
              disabled={!canAddMore}
              className="mt-3"
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              {canAddMore
                ? t("multiparcelAddCustomCta")
                : t("multiparcelMaxReached", { max: MAX_PARCELS_PER_BOOKING })}
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="multiparcel-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 id="multiparcel-heading" className="text-text-primary text-sm font-semibold">
            {parcels.length === 0
              ? t("multiparcelEmptyHint")
              : parcels.length === 1
                ? t("multiparcelSendingOne")
                : t("multiparcelSendingN", { count: parcels.length })}
          </h3>
          <p className="text-text-muted text-xs">
            {t("multiparcelLimit", { max: MAX_PARCELS_PER_BOOKING })}
          </p>
        </div>

        {hasParcels && (
          <ul className="flex flex-col gap-2">
            {parcels.map((parcel, i) => (
              <li key={i}>
                <ParcelRow
                  index={i}
                  parcel={parcel}
                  presets={presets}
                  onChange={(next) => updateParcel(i, next)}
                  onRemove={() => removeParcel(i)}
                />
              </li>
            ))}
          </ul>
        )}

        {!canAddMore && (
          <p className="text-text-muted text-xs italic">
            {t("multiparcelMaxReached", { max: MAX_PARCELS_PER_BOOKING })}
          </p>
        )}
      </section>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleContinue}
          disabled={!hasParcels}
          className="text-base font-semibold"
        >
          {t("next")}
          <ChevronIcon direction="right" className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
