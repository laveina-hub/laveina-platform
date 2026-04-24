"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Select } from "@/components/atoms";
import { useSavedAddresses, type SavedAddress } from "@/hooks/use-saved-addresses";

// A5 (client answer 2026-04-21): Saved addresses appear as a dropdown above
// the postcode input on Step 2 (both FROM and TO columns). Renders nothing
// for unauthenticated users and nothing when the list is empty — keeps the
// page clean for guests / first-time customers.
//
// The dropdown behaves like a "picker trigger": selecting an entry fires
// onSelect with the full joined row, then resets the select to placeholder.
// The parent reflects the selection via the postcode input + pickup-point
// card list, so the dropdown itself stays stateless.

export type SavedAddressDropdownProps = {
  /** Used for label copy + id (origin vs destination column). */
  side: "origin" | "destination";
  /** Fires when the user picks an address. The dropdown returns the full
   *  joined row so the parent can extract postcode + pickup-point id without
   *  an extra fetch. */
  onSelect: (address: SavedAddress) => void;
  className?: string;
};

export function SavedAddressDropdown({ side, onSelect, className }: SavedAddressDropdownProps) {
  const t = useTranslations("booking");
  const { data, isLoading, isError } = useSavedAddresses();
  const selectRef = useRef<HTMLSelectElement>(null);

  // Don't render for logged-out users (query disabled) or while an empty list
  // comes back — the dropdown would just be dead weight above the postcode.
  if (isLoading || isError || !data || data.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <label
        htmlFor={`saved-address-${side}`}
        className="text-text-primary mb-1 block text-xs font-medium"
      >
        {t("savedAddressLabel")}
      </label>
      <Select
        id={`saved-address-${side}`}
        ref={selectRef}
        defaultValue=""
        onChange={(e) => {
          const nextId = e.target.value;
          const next = data.find((a) => a.id === nextId);
          if (next) {
            onSelect(next);
            // Reset the <select> back to placeholder so it reads as a
            // trigger, not a persistent selection.
            if (selectRef.current) selectRef.current.value = "";
          }
        }}
        className="py-2 text-sm"
      >
        <option value="" disabled>
          {t("savedAddressPlaceholder")}
        </option>
        {data.map((entry) => {
          const suffix = entry.pickup_point
            ? `${entry.pickup_point.name} · ${entry.pickup_point.postcode}`
            : "";
          return (
            <option key={entry.id} value={entry.id}>
              {suffix ? `${entry.label} — ${suffix}` : entry.label}
              {entry.is_default ? ` (${t("savedAddressDefaultSuffix")})` : ""}
            </option>
          );
        })}
      </Select>
    </div>
  );
}
