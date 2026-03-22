"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { ParcelSize } from "@/types/enums";

type ParcelSizeConfig = {
  size: ParcelSize;
  max_weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
};

const SIZE_LABEL_KEYS: Record<ParcelSize, string> = {
  small: "parcelSizeSmall",
  medium: "parcelSizeMedium",
  large: "parcelSizeLarge",
  extra_large: "parcelSizeExtraLarge",
  xxl: "parcelSizeXxl",
};

const ALL_SIZES: ParcelSize[] = ["small", "medium", "large", "extra_large", "xxl"];

export function ParcelSizeGrid({
  selectedSize,
  onSelect,
  getSizeConfig,
}: {
  selectedSize: ParcelSize | undefined;
  onSelect: (size: ParcelSize) => void;
  getSizeConfig: (size: ParcelSize) => ParcelSizeConfig;
}) {
  const t = useTranslations("booking");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ALL_SIZES.map((size) => {
        const cfg = getSizeConfig(size);
        const isSelected = selectedSize === size;
        return (
          <button
            key={size}
            type="button"
            onClick={() => onSelect(size)}
            aria-pressed={isSelected}
            className={cn(
              "flex flex-col items-center rounded-xl border p-4 text-center transition-colors focus:outline-none",
              isSelected
                ? "border-primary-400 bg-primary-50 text-primary-700"
                : "border-border-default hover:border-primary-200 hover:bg-primary-50 bg-white"
            )}
          >
            <span className="text-base font-semibold">{t(SIZE_LABEL_KEYS[size])}</span>
            <span className="text-text-muted mt-1 text-xs">
              {t("dimensions", { l: cfg.length_cm, w: cfg.width_cm, h: cfg.height_cm })}
            </span>
            <span className="text-text-muted text-xs">
              {t("maxWeight", { weight: cfg.max_weight_kg })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
