"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, CardBody, CardShell, Input, Label } from "@/components/atoms";
import { CloseIcon, MapPinIcon, PlusIcon, StarIcon } from "@/components/icons";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import {
  useSavedAddressMutations,
  useSavedAddresses,
  type SavedAddress,
} from "@/hooks/use-saved-addresses";
import { cn } from "@/lib/utils";

// CRUD UI for A5 saved addresses. Service + hook + API routes shipped in
// S2.2.2; this section wires them into the customer dashboard.
//
// Pickup-point picker is intentionally minimal — customer types a 5-digit
// postcode, picks from the list, confirms. Full-map picker used in the
// booking wizard is overkill here.

// Q14.1.11 — common labels offered as one-tap suggestions on the form. The
// keys live under `customerAddresses` so each locale provides the matching
// translation; the field itself stays free-form.
const LABEL_SUGGESTION_KEYS = [
  "labelSuggestionHome",
  "labelSuggestionOffice",
  "labelSuggestionFamily",
  "labelSuggestionOther",
] as const;

type FormMode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; address: SavedAddress };

export function CustomerAddressesSection() {
  const t = useTranslations("customerAddresses");
  const { data: addresses, isLoading } = useSavedAddresses();
  const { create, update, remove } = useSavedAddressMutations();

  const [formMode, setFormMode] = useState<FormMode>({ kind: "closed" });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
          <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
        </div>
        {formMode.kind === "closed" && (
          <Button size="sm" className="gap-2" onClick={() => setFormMode({ kind: "create" })}>
            <PlusIcon size={16} />
            {t("add")}
          </Button>
        )}
      </header>

      {formMode.kind !== "closed" && (
        <AddressForm
          mode={formMode}
          onCancel={() => setFormMode({ kind: "closed" })}
          onSubmit={async (payload) => {
            if (formMode.kind === "create") {
              await create.mutateAsync(payload);
              toast.success(t("created"));
            } else {
              await update.mutateAsync({ id: formMode.address.id, patch: payload });
              toast.success(t("updated"));
            }
            setFormMode({ kind: "closed" });
          }}
        />
      )}

      {isLoading ? (
        <p className="text-text-muted text-sm">{t("loading")}</p>
      ) : !addresses || addresses.length === 0 ? (
        <CardShell>
          <CardBody className="flex flex-col items-center gap-3 text-center">
            <MapPinIcon className="text-text-muted" size={28} />
            <div>
              <p className="text-text-primary font-medium">{t("emptyTitle")}</p>
              <p className="text-text-muted text-sm">{t("emptySubtitle")}</p>
            </div>
          </CardBody>
        </CardShell>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id}>
              <AddressCard
                address={address}
                onEdit={() => setFormMode({ kind: "edit", address })}
                onDelete={async () => {
                  if (!confirm(t("confirmDelete", { label: address.label }))) return;
                  try {
                    await remove.mutateAsync(address.id);
                    toast.success(t("deleted"));
                  } catch {
                    toast.error(t("deleteFailed"));
                  }
                }}
                onSetDefault={async () => {
                  try {
                    await update.mutateAsync({
                      id: address.id,
                      patch: { is_default: true },
                    });
                    toast.success(t("defaultSet"));
                  } catch {
                    toast.error(t("updateFailed"));
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── card ───────────────────────────────────────────────────────────────────

type CardProps = {
  address: SavedAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
};

function AddressCard({ address, onEdit, onDelete, onSetDefault }: CardProps) {
  const t = useTranslations("customerAddresses");
  const point = address.pickup_point;

  return (
    <CardShell className={cn(address.is_default && "border-primary-300")}>
      <CardBody className="px-5! py-4!">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-text-primary text-base font-semibold">{address.label}</p>
            {address.is_default && (
              <span className="bg-primary-50 text-primary-700 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
                <StarIcon size={11} filled />
                {t("defaultBadge")}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={t("editAria", { label: address.label })}
              className="text-text-muted hover:text-primary-600 focus-visible:outline-primary-500 flex h-7 w-7 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Pencil size={14} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={t("deleteAria", { label: address.label })}
              className="text-text-muted hover:text-error focus-visible:outline-primary-500 flex h-7 w-7 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </div>
        {point && (
          <div className="text-text-muted mt-2 flex items-start gap-2 text-sm">
            <MapPinIcon size={14} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-text-primary truncate font-medium">{point.name}</p>
              <p className="truncate text-xs">
                {point.postcode}
                {point.city ? ` · ${point.city}` : ""}
              </p>
            </div>
          </div>
        )}
        {!address.is_default && (
          <button
            type="button"
            onClick={onSetDefault}
            className="text-primary-600 hover:text-primary-700 mt-3 inline-flex items-center gap-1 text-xs font-medium"
          >
            <StarIcon size={12} />
            {t("makeDefault")}
          </button>
        )}
      </CardBody>
    </CardShell>
  );
}

// ── form ───────────────────────────────────────────────────────────────────

type FormPayload = {
  label: string;
  pickup_point_id: string;
  is_default: boolean;
};

type FormProps = {
  mode: Extract<FormMode, { kind: "create" | "edit" }>;
  onSubmit: (payload: FormPayload) => Promise<void>;
  onCancel: () => void;
};

function AddressForm({ mode, onSubmit, onCancel }: FormProps) {
  const t = useTranslations("customerAddresses");

  const initial =
    mode.kind === "edit"
      ? {
          label: mode.address.label,
          postcode: mode.address.pickup_point?.postcode ?? "",
          pickup_point_id: mode.address.pickup_point_id,
          is_default: mode.address.is_default,
        }
      : { label: "", postcode: "", pickup_point_id: "", is_default: false };

  const [label, setLabel] = useState(initial.label);
  const [postcode, setPostcode] = useState(initial.postcode);
  const [pickupPointId, setPickupPointId] = useState(initial.pickup_point_id);
  const [isDefault, setIsDefault] = useState(initial.is_default);
  const [submitting, setSubmitting] = useState(false);

  const shouldFetch = postcode.length === 5;
  const { data: points, isFetching } = usePickupPoints(shouldFetch ? postcode : undefined);
  const options = useMemo(() => points ?? [], [points]);

  // If the user changes postcode, drop a stale pickup-point selection.
  function handlePostcodeChange(next: string) {
    setPostcode(next);
    if (pickupPointId && !options.some((p) => p.id === pickupPointId)) {
      setPickupPointId("");
    }
  }

  const canSubmit = label.trim().length > 0 && !!pickupPointId && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        label: label.trim(),
        pickup_point_id: pickupPointId,
        is_default: isDefault,
      });
    } catch (err) {
      console.error("address save failed:", err);
      toast.error(t("saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CardShell>
      <CardBody className="px-5! py-5!">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-text-primary text-base font-semibold">
            {mode.kind === "edit" ? t("editTitle") : t("addTitle")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("cancel")}
            className="text-text-muted hover:text-text-primary focus-visible:outline-primary-500 flex h-7 w-7 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <Label htmlFor="address_label">{t("labelField")}</Label>
            {/* Q14.1.11 — quick-pick suggestions for the most common labels.
                Free-form input is preserved so the user can type "Mum's place"
                or anything else; the chips just remove typing for the 80%
                case. Selecting a chip overwrites the field. */}
            <div className="mt-1.5 mb-2 flex flex-wrap gap-1.5">
              {LABEL_SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLabel(t(key))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    label.trim().toLowerCase() === t(key).toLowerCase()
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-border-default text-text-muted hover:border-primary-300"
                  )}
                >
                  {t(key)}
                </button>
              ))}
            </div>
            <Input
              id="address_label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("labelPlaceholder")}
              maxLength={64}
              required
            />
          </div>

          <div>
            <Label htmlFor="address_postcode">{t("postcode")}</Label>
            <Input
              id="address_postcode"
              value={postcode}
              onChange={(e) => handlePostcodeChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              pattern="[0-9]{5}"
              placeholder="08001"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="address_pickup_point">{t("pickupPoint")}</Label>
            <select
              id="address_pickup_point"
              value={pickupPointId}
              onChange={(e) => setPickupPointId(e.target.value)}
              disabled={!shouldFetch || isFetching || options.length === 0}
              required
              className="border-border-default text-text-primary focus:border-primary-400 focus:ring-primary-400/20 disabled:bg-bg-muted mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm transition-all duration-150 focus:ring-2 focus:outline-none disabled:cursor-not-allowed"
            >
              <option value="">
                {!shouldFetch
                  ? t("postcodeHint")
                  : isFetching
                    ? t("loading")
                    : options.length === 0
                      ? t("noPoints")
                      : t("selectPoint")}
              </option>
              {options.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name} · {point.address}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-primary-600"
            />
            <span>{t("setDefault")}</span>
          </label>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {submitting ? t("saving") : mode.kind === "edit" ? t("saveChanges") : t("addAddress")}
            </Button>
          </div>
        </form>
      </CardBody>
    </CardShell>
  );
}
