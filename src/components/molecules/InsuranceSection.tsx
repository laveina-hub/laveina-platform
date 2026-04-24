"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Input, Label } from "@/components/atoms";
import { ChevronIcon } from "@/components/icons";
import {
  INSURANCE_TIERS,
  MAX_INSURED_VALUE_CENTS,
  getInsuranceCostCents,
  getInsuranceCoverageCapCents,
} from "@/constants/insurance-tiers";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ParcelItemInput } from "@/validations/shipment.schema";

// A3 + A1 (client answer 2026-04-21): insurance is per parcel. The section
// is collapsed by default; expanding it reveals one row per parcel with a
// declared-value input. The cost auto-resolves from the 8-tier matrix.
// Tier table collapsible below the rows.

export type InsuranceSectionProps = {
  parcels: ParcelItemInput[];
  onChangeParcel: (index: number, next: ParcelItemInput) => void;
  className?: string;
};

/** Compact "Parcel N" label so the UI doesn't force global parcel-store reads. */
function parcelRowLabel(index: number): string {
  return `${index + 1}`;
}

export function InsuranceSection({ parcels, onChangeParcel, className }: InsuranceSectionProps) {
  const t = useTranslations("booking");

  const anyInsured = parcels.some(
    (p) => p.wants_insurance === true || (p.declared_value_cents ?? 0) > 0
  );

  // Start expanded if any parcel already has insurance (e.g. returning draft).
  const [expanded, setExpanded] = useState(anyInsured);
  const [tierTableOpen, setTierTableOpen] = useState(false);

  const total = useMemo(
    () => parcels.reduce((sum, p) => sum + getInsuranceCostCents(p.declared_value_cents ?? 0), 0),
    [parcels]
  );

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    // Collapsing the section clears every parcel's insurance so nothing ghost-
    // charges after a user's toggle.
    if (!next) {
      parcels.forEach((parcel, i) => {
        if (parcel.wants_insurance || (parcel.declared_value_cents ?? 0) > 0) {
          onChangeParcel(i, {
            ...parcel,
            wants_insurance: false,
            declared_value_cents: 0,
          });
        }
      });
    }
  }

  function handleDeclaredValueChange(index: number, euroString: string) {
    const parsed = Number.parseFloat(euroString);
    const clampedEuros = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    const cents = Math.min(Math.round(clampedEuros * 100), MAX_INSURED_VALUE_CENTS);
    const parcel = parcels[index];
    if (!parcel) return;
    onChangeParcel(index, {
      ...parcel,
      declared_value_cents: cents,
      wants_insurance: cents > 0,
    });
  }

  return (
    <section
      className={cn("border-border-muted overflow-hidden rounded-2xl border bg-white", className)}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        className="focus-visible:outline-primary-500 flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <div>
          <h2 className="text-text-primary text-base font-semibold">
            {t("insuranceSectionTitle")}
          </h2>
          <p className="text-text-muted mt-0.5 text-xs">{t("insuranceSectionSubtitle")}</p>
          {/* Q9.4 — surface the free baseline only when the user hasn't opted into
              extra cover, so they don't think their parcel is uninsured. */}
          {!expanded && (
            <p className="text-primary-700 mt-1.5 text-xs font-medium">
              {t("insuranceFreeBaseline")}
            </p>
          )}
        </div>
        <ChevronIcon
          direction={expanded ? "up" : "down"}
          className="text-text-muted h-5 w-5"
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-border-muted border-t px-5 py-4">
          <div className="flex flex-col gap-3">
            {parcels.map((parcel, index) => {
              const declaredEuros = parcel.declared_value_cents
                ? (parcel.declared_value_cents / 100).toString()
                : "";
              const costCents = getInsuranceCostCents(parcel.declared_value_cents ?? 0);
              const coverageCapCents = getInsuranceCoverageCapCents(
                parcel.declared_value_cents ?? 0
              );
              const inputId = `parcel-${index}-declared-value`;

              return (
                <div key={index} className="bg-bg-secondary/60 flex flex-col gap-2 rounded-xl p-3">
                  <div className="grid items-end gap-3 sm:grid-cols-[auto_1fr_auto]">
                    <p className="text-text-primary text-sm font-medium sm:pb-2.5">
                      {t("insuranceParcelLabel", { index: parcelRowLabel(index) })}
                    </p>

                    <div>
                      <Label htmlFor={inputId} className="text-text-muted text-xs">
                        {t("insuranceDeclaredValue")}
                      </Label>
                      <Input
                        id={inputId}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={MAX_INSURED_VALUE_CENTS / 100}
                        step="0.01"
                        value={declaredEuros}
                        onChange={(e) => handleDeclaredValueChange(index, e.target.value)}
                        className="mt-1.5"
                        placeholder={t("insuranceDeclaredValuePlaceholder")}
                      />
                    </div>

                    <div className="text-right sm:pb-2.5">
                      <p className="text-text-muted text-xs">{t("insuranceRowCost")}</p>
                      <p className="text-text-primary text-sm font-semibold tabular-nums">
                        {costCents > 0 ? formatCents(costCents) : "—"}
                      </p>
                    </div>
                  </div>

                  {coverageCapCents > 0 && (
                    <p className="text-text-muted text-xs">
                      {t("insuranceCoverageUpTo", {
                        amount: formatCents(coverageCapCents),
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-border-muted mt-4 flex items-center justify-between border-t pt-3">
            <p className="text-text-primary text-sm font-medium">{t("insuranceTotal")}</p>
            <p className="text-text-primary text-sm font-semibold tabular-nums">
              {formatCents(total)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTierTableOpen((v) => !v)}
            aria-expanded={tierTableOpen}
            className="text-primary-600 hover:text-primary-700 mt-3 inline-flex items-center gap-1 text-xs font-medium"
          >
            <ChevronIcon
              direction={tierTableOpen ? "up" : "down"}
              className="h-3 w-3"
              aria-hidden
            />
            {t("insuranceTierTableToggle")}
          </button>

          {tierTableOpen && (
            <dl className="text-text-muted mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
              {INSURANCE_TIERS.map((tier) => (
                <div
                  key={tier.labelKey}
                  className="bg-bg-secondary/60 flex items-center justify-between gap-2 rounded-md px-2 py-1"
                >
                  <dt>{t(tier.labelKey)}</dt>
                  <dd className="text-text-primary font-medium tabular-nums">
                    {formatCents(tier.costCents)}
                  </dd>
                </div>
              ))}
              <p className="mt-1 text-[11px] italic sm:col-span-2">{t("insuranceMaxCoverage")}</p>
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
