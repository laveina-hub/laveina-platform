"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type ComponentType } from "react";

import { Button, Input, Label, Select } from "@/components/atoms";
import { BoxIcon, BriefcaseIcon, CloseIcon, FootprintsIcon, WeightIcon } from "@/components/icons";
import {
  MAX_LONGEST_SIDE_CM,
  MAX_WEIGHT_KG,
  validateParcelDimensions,
  type ParcelPreset,
  type ParcelPresetSlug,
} from "@/constants/parcel-sizes";
import type { ParcelItemInput } from "@/validations/shipment.schema";

// Unified parcel row — used for every parcel in the booking (Option A design,
// 2026-04-24). Supports preset picks AND inline custom-size editing, so the
// list below Step 1's grid is the single source of truth for parcels.
// Switching the dropdown to "Custom" seeds dimensions from the active preset
// and opens the edit form so zod's refine (preset OR all three dims) never
// sees a transitional invalid state.

const ICON_BY_SLUG: Record<ParcelPresetSlug, ComponentType<{ className?: string }>> = {
  mini: BoxIcon,
  small: FootprintsIcon,
  medium: WeightIcon,
  large: BriefcaseIcon,
};

type SizeSelection = ParcelPresetSlug | "custom";

type CustomDraft = {
  length: string;
  width: string;
  height: string;
  weight: string;
};

function draftFromParcel(parcel: ParcelItemInput): CustomDraft {
  return {
    length: parcel.length_cm?.toString() ?? "",
    width: parcel.width_cm?.toString() ?? "",
    height: parcel.height_cm?.toString() ?? "",
    weight: parcel.weight_kg?.toString() ?? "",
  };
}

export type ParcelRowProps = {
  /** 0-based index; labelled as "Parcel N+1" in the UI. */
  index: number;
  parcel: ParcelItemInput;
  presets: ParcelPreset[];
  onChange: (parcel: ParcelItemInput) => void;
  /** Omit to hide the remove button (e.g. for the primary parcel). */
  onRemove?: () => void;
};

export function ParcelRow({ index, parcel, presets, onChange, onRemove }: ParcelRowProps) {
  const t = useTranslations("booking");
  const tPresets = useTranslations("parcelPresets");
  const tv = useTranslations("validation");

  const isCustom = parcel.preset_slug === null;
  const currentSelection: SizeSelection =
    parcel.preset_slug === null ? "custom" : parcel.preset_slug;
  const currentPreset =
    parcel.preset_slug !== null
      ? (presets.find((p) => p.slug === parcel.preset_slug) ?? null)
      : null;
  const Icon = currentPreset ? ICON_BY_SLUG[currentPreset.slug] : BoxIcon;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CustomDraft>(() => draftFromParcel(parcel));
  const [error, setError] = useState<{ key: string; values?: Record<string, number> } | null>(null);

  // Keep the draft in sync when the parcel changes from outside (e.g. the
  // dropdown switches preset → custom). Skip while the user is actively
  // editing so we don't clobber in-progress input.
  useEffect(() => {
    if (!editing) {
      setDraft(draftFromParcel(parcel));
    }
  }, [parcel, editing]);

  function handleSelectionChange(next: SizeSelection) {
    setError(null);

    if (next === "custom") {
      // Seed dims from the active preset (or previous custom values) so the
      // parcel remains schema-valid while the user tweaks the inputs.
      const seedLength = currentPreset?.lengthCm ?? parcel.length_cm ?? 0;
      const seedWidth = currentPreset?.widthCm ?? parcel.width_cm ?? 0;
      const seedHeight = currentPreset?.heightCm ?? parcel.height_cm ?? 0;
      const seedWeight = currentPreset?.maxWeightKg ?? parcel.weight_kg;

      onChange({
        preset_slug: null,
        length_cm: seedLength,
        width_cm: seedWidth,
        height_cm: seedHeight,
        weight_kg: seedWeight,
        wants_insurance: parcel.wants_insurance ?? false,
        declared_value_cents: parcel.declared_value_cents,
      });
      setDraft({
        length: seedLength ? String(seedLength) : "",
        width: seedWidth ? String(seedWidth) : "",
        height: seedHeight ? String(seedHeight) : "",
        weight: seedWeight ? String(seedWeight) : "",
      });
      setEditing(true);
      return;
    }

    const preset = presets.find((p) => p.slug === next);
    if (!preset) return;
    setEditing(false);
    onChange({
      preset_slug: preset.slug,
      weight_kg: preset.maxWeightKg,
      wants_insurance: parcel.wants_insurance ?? false,
      declared_value_cents: parcel.declared_value_cents,
    });
  }

  function handleApplyEdit() {
    const length = Number(draft.length);
    const width = Number(draft.width);
    const height = Number(draft.height);
    const weight = Number(draft.weight);

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
      setError({ key: "validation.dimensionRequired" });
      return;
    }
    if (weight > MAX_WEIGHT_KG) {
      setError({ key: "validation.weightMax", values: { max: MAX_WEIGHT_KG } });
      return;
    }
    const dimResult = validateParcelDimensions(length, width, height);
    if (!dimResult.valid) {
      setError({ key: dimResult.error, values: dimResult.values });
      return;
    }

    setError(null);
    setEditing(false);
    onChange({
      preset_slug: null,
      length_cm: length,
      width_cm: width,
      height_cm: height,
      weight_kg: weight,
      wants_insurance: parcel.wants_insurance ?? false,
      declared_value_cents: parcel.declared_value_cents,
    });
  }

  function handleCancelEdit() {
    setDraft(draftFromParcel(parcel));
    setError(null);
    setEditing(false);
  }

  const customSummary =
    isCustom && parcel.length_cm && parcel.width_cm && parcel.height_cm
      ? `${t("upToWeight", { weight: `${parcel.weight_kg}kg` })} · ${t("dimensionsLabel", {
          length: parcel.length_cm,
          width: parcel.width_cm,
          height: parcel.height_cm,
        })}`
      : null;

  return (
    <div className="border-border-default flex flex-col gap-3 rounded-xl border bg-white px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="bg-bg-muted text-text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-text-muted text-xs">
            {t("multiparcelParcelLabel", { index: index + 1 })}
          </p>
          <p className="text-text-primary truncate text-sm font-semibold">
            {isCustom
              ? t("customSizeToggle")
              : currentPreset
                ? tPresets(`${currentPreset.slug}.name`)
                : "—"}
          </p>
          {!isCustom && currentPreset && (
            <p className="text-text-muted text-xs">
              {t("upToWeight", { weight: `${currentPreset.maxWeightKg}kg` })} ·{" "}
              {t("dimensionsLabel", {
                length: currentPreset.lengthCm,
                width: currentPreset.widthCm,
                height: currentPreset.heightCm,
              })}
            </p>
          )}
          {isCustom && !editing && customSummary && (
            <p className="text-text-muted text-xs">{customSummary}</p>
          )}
        </div>

        <label className="sr-only" htmlFor={`parcel-${index}-preset`}>
          {t("multiparcelChangeSize")}
        </label>
        <Select
          id={`parcel-${index}-preset`}
          value={currentSelection}
          onChange={(e) => handleSelectionChange(e.target.value as SizeSelection)}
          className="w-36 py-2 text-sm"
        >
          {presets.map((p) => (
            <option key={p.slug} value={p.slug}>
              {tPresets(`${p.slug}.name`)}
            </option>
          ))}
          <option value="custom">{t("multiparcelCustomOption")}</option>
        </Select>

        {isCustom && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(draftFromParcel(parcel));
              setError(null);
              setEditing(true);
            }}
            className="shrink-0"
          >
            {t("multiparcelCustomEdit")}
          </Button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("multiparcelRemove", { index: index + 1 })}
            className="text-text-muted hover:text-error focus-visible:ring-primary-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <CloseIcon className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {isCustom && editing && (
        <div className="border-border-default flex flex-col gap-3 border-t pt-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor={`parcel-${index}-length`} className="text-text-primary text-sm">
                {t("customSizeLength")}
              </Label>
              <Input
                id={`parcel-${index}-length`}
                type="number"
                min={1}
                max={MAX_LONGEST_SIDE_CM}
                inputMode="numeric"
                value={draft.length}
                onChange={(e) => setDraft((d) => ({ ...d, length: e.target.value }))}
                hasError={!!error}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor={`parcel-${index}-width`} className="text-text-primary text-sm">
                {t("customSizeWidth")}
              </Label>
              <Input
                id={`parcel-${index}-width`}
                type="number"
                min={1}
                max={MAX_LONGEST_SIDE_CM}
                inputMode="numeric"
                value={draft.width}
                onChange={(e) => setDraft((d) => ({ ...d, width: e.target.value }))}
                hasError={!!error}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor={`parcel-${index}-height`} className="text-text-primary text-sm">
                {t("customSizeHeight")}
              </Label>
              <Input
                id={`parcel-${index}-height`}
                type="number"
                min={1}
                max={MAX_LONGEST_SIDE_CM}
                inputMode="numeric"
                value={draft.height}
                onChange={(e) => setDraft((d) => ({ ...d, height: e.target.value }))}
                hasError={!!error}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor={`parcel-${index}-weight`} className="text-text-primary text-sm">
                {t("customSizeWeight")}
              </Label>
              <Input
                id={`parcel-${index}-weight`}
                type="number"
                min={0.1}
                max={MAX_WEIGHT_KG}
                step={0.1}
                inputMode="decimal"
                value={draft.weight}
                onChange={(e) => setDraft((d) => ({ ...d, weight: e.target.value }))}
                hasError={!!error}
                className="mt-1.5"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-error text-xs">
              {tv(error.key.replace("validation.", ""), error.values)}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" onClick={handleApplyEdit}>
              {t("multiparcelCustomDone")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
              {t("multiparcelCustomCancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
