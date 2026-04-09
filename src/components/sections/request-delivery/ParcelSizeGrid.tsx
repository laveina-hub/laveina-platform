"use client";

import { Package } from "lucide-react";
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

/** Relative icon sizes per parcel size for visual hierarchy */
const SIZE_ICON_CLASSES: Record<ParcelSize, string> = {
  small: "h-6 w-6",
  medium: "h-7 w-7",
  large: "h-8 w-8",
  extra_large: "h-9 w-9",
  xxl: "h-10 w-10",
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
              "group flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200 focus:outline-none",
              isSelected
                ? "border-primary-400 bg-primary-50 shadow-primary-500/10 shadow-md"
                : "bg-bg-secondary hover:border-primary-200 hover:bg-primary-50 border-transparent hover:shadow-sm"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-lg p-2 transition-colors",
                isSelected
                  ? "bg-primary-500 text-white"
                  : "bg-primary-100 text-primary-600 group-hover:bg-primary-200"
              )}
            >
              <Package className={SIZE_ICON_CLASSES[size]} />
            </div>
            <span
              className={cn(
                "text-sm font-semibold",
                isSelected ? "text-primary-700" : "text-text-primary"
              )}
            >
              {t(SIZE_LABEL_KEYS[size])}
            </span>
            <div className="space-y-0.5">
              <span className="text-text-muted block text-[11px]">
                {t("dimensions", { l: cfg.length_cm, w: cfg.width_cm, h: cfg.height_cm })}
              </span>
              <span className="text-text-muted block text-[11px]">
                {t("maxWeight", { weight: cfg.max_weight_kg })}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
