"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button, Checkbox, Input, Label } from "@/components/atoms";
import { useBookingStore, type SenderFieldErrors } from "@/hooks/use-booking-store";
import { bookingSenderUiSchema } from "@/validations/shipment.schema";

// A4 sender section, lifted out of Step3Recipient.tsx as a sibling file.
// Owns its own draft state + Zod-validated save flow, and surfaces inline
// errors when Step 3's advance guard or the create-checkout server validator
// hands back field-level messages via `pendingErrors`.

export const SENDER_FIELD_KEYS = [
  "sender_first_name",
  "sender_last_name",
  "sender_phone",
  "sender_whatsapp",
  "sender_email",
] as const satisfies ReadonlyArray<keyof SenderFieldErrors>;

/** Translates a Zod `flatten()` shape into the `SenderFieldErrors` map the
 *  booking store / SenderSection consume. Used both client-side (Step 3
 *  advance guard) and to apply server-flagged errors handed off from
 *  `use-step4-checkout`. */
export function flattenSenderErrors(
  fieldErrors: Record<string, string[] | undefined>
): SenderFieldErrors {
  const out: SenderFieldErrors = {};
  for (const key of SENDER_FIELD_KEYS) {
    const message = fieldErrors[key]?.[0];
    if (message) out[key] = message;
  }
  return out;
}

type SenderValue = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string | null;
};

export type SenderSectionProps = {
  sender: ReturnType<typeof useBookingStore.getState>["sender"];
  editing: boolean;
  setEditing: (next: boolean) => void;
  onSave: (patch: SenderValue) => void;
  onCancel: () => void;
  /** Server-flagged or guard-flagged sender errors. When set, the section
   *  auto-opens in edit mode, populates inline errors, and scrolls + focuses
   *  the first offending input. */
  pendingErrors: SenderFieldErrors | null;
  clearPendingErrors: () => void;
};

export function SenderSection({
  sender,
  editing,
  setEditing,
  onSave,
  onCancel,
  pendingErrors,
  clearPendingErrors,
}: SenderSectionProps) {
  const t = useTranslations("booking");
  const tv = useTranslations("validation");

  const initial: SenderValue = sender
    ? {
        firstName: sender.firstName,
        lastName: sender.lastName,
        phone: sender.phone,
        whatsapp: sender.whatsapp || sender.phone,
        email: sender.email,
        city: sender.city ?? null,
      }
    : { firstName: "", lastName: "", phone: "", whatsapp: "", email: "", city: null };

  const [draft, setDraft] = useState<SenderValue>(initial);
  const [errors, setErrors] = useState<SenderFieldErrors>({});

  // Q3.3 — mirrors the receiver form: default-on when phone and whatsapp match
  // (or whatsapp is empty). Toggling it off reveals a separate input; on save
  // the phone is copied into whatsapp when the checkbox is on.
  const seedWhatsappMatches = !initial.whatsapp || initial.whatsapp === initial.phone;
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(seedWhatsappMatches);

  // Reset the draft whenever the upstream sender changes (e.g. first-time
  // hydrate from profile). Keeps the form in sync without stomping in-progress
  // edits: only resets when we're not in editing mode.
  useEffect(() => {
    if (!editing) {
      setDraft(initial);
      setWhatsappSameAsPhone(seedWhatsappMatches);
      setErrors({});
    }
    // intentionally shallow — initial is rebuilt from sender each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sender?.firstName,
    sender?.lastName,
    sender?.phone,
    sender?.whatsapp,
    sender?.email,
    sender?.city,
    editing,
  ]);

  // Apply pending sender errors handed off from the Step 3 advance guard or
  // from a server validation failure on Pay click. Force edit mode open,
  // populate inline messages, scroll + focus the first offending field, then
  // clear so a re-render doesn't keep re-applying stale messages once the
  // user starts typing.
  useEffect(() => {
    if (!pendingErrors) return;
    const entries = Object.entries(pendingErrors) as Array<[keyof SenderFieldErrors, string]>;
    if (entries.length === 0) {
      clearPendingErrors();
      return;
    }
    setEditing(true);
    setErrors(pendingErrors);
    const [firstField] = entries[0];
    requestAnimationFrame(() => {
      const el = document.getElementById(firstField);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      }
    });
    clearPendingErrors();
  }, [pendingErrors, setEditing, clearPendingErrors]);

  const overridden = sender?.overriddenLocally === true;

  function attemptSave() {
    // Validate the draft against the same shape the server's create-checkout
    // route uses, so anything we save into the booking store is already safe
    // to forward to Stripe. If it fails, surface the field errors inline and
    // keep the section open so the user can fix them.
    const result = bookingSenderUiSchema.safeParse({
      sender_first_name: draft.firstName,
      sender_last_name: draft.lastName,
      sender_phone: draft.phone,
      sender_whatsapp_same_as_phone: whatsappSameAsPhone,
      sender_whatsapp: whatsappSameAsPhone ? "" : draft.whatsapp,
      sender_email: draft.email,
    });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const next: SenderFieldErrors = {};
      for (const key of SENDER_FIELD_KEYS) {
        const message = fieldErrors[key]?.[0];
        if (message) next[key] = message;
      }
      setErrors(next);
      const firstKey = SENDER_FIELD_KEYS.find((k) => next[k]);
      if (firstKey) {
        const el = document.getElementById(firstKey);
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: false });
      }
      return;
    }
    setErrors({});
    onSave({
      ...draft,
      whatsapp: whatsappSameAsPhone ? draft.phone : draft.whatsapp,
    });
  }

  const renderError = (key: keyof SenderFieldErrors) =>
    errors[key] ? (
      <p role="alert" className="text-error mt-1 text-xs">
        {tv(errors[key]!.replace("validation.", ""))}
      </p>
    ) : null;

  return (
    <section className="border-border-muted rounded-2xl border bg-white p-5 sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-text-primary text-base font-semibold">{t("senderSectionTitle")}</h2>
          {overridden && <p className="text-text-muted mt-0.5 text-xs">{t("senderEditHelper")}</p>}
        </div>
        {!editing && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            {t("senderEdit")}
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="text-text-primary text-sm">
          <p>
            {sender?.city
              ? t.rich("senderSendingFromWithCity", {
                  name: joinName(sender) || "—",
                  city: sender.city,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })
              : t.rich("senderSendingFrom", {
                  name: joinName(sender) || "—",
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
          </p>
          <dl className="mt-3 grid gap-y-1.5 text-xs sm:grid-cols-2 sm:gap-x-6">
            <SenderRow label={t("senderPhone")} value={sender?.phone ?? ""} />
            <SenderRow
              label={t("senderWhatsapp")}
              value={sender?.whatsapp || sender?.phone || ""}
            />
            <SenderRow label={t("senderEmail")} value={sender?.email ?? ""} />
          </dl>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sender_first_name" className="text-text-primary text-sm">
              {t("senderFirstName")}
            </Label>
            <Input
              id="sender_first_name"
              value={draft.firstName}
              onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
              className="mt-1.5"
              autoComplete="given-name"
              hasError={!!errors.sender_first_name}
            />
            {renderError("sender_first_name")}
          </div>

          <div>
            <Label htmlFor="sender_last_name" className="text-text-primary text-sm">
              {t("senderLastName")}
            </Label>
            <Input
              id="sender_last_name"
              value={draft.lastName}
              onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
              className="mt-1.5"
              autoComplete="family-name"
              hasError={!!errors.sender_last_name}
            />
            {renderError("sender_last_name")}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="sender_phone" className="text-text-primary text-sm">
              {t("senderPhone")}
            </Label>
            <Input
              id="sender_phone"
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="mt-1.5"
              autoComplete="tel"
              hasError={!!errors.sender_phone}
            />
            {renderError("sender_phone")}
          </div>

          <div className="sm:col-span-2">
            <Checkbox
              id="sender_whatsapp_same_as_phone"
              label={t("senderWhatsappSameAsPhone")}
              checked={whatsappSameAsPhone}
              onChange={(e) => setWhatsappSameAsPhone(e.target.checked)}
            />
          </div>

          {!whatsappSameAsPhone && (
            <div className="sm:col-span-2">
              <Label htmlFor="sender_whatsapp" className="text-text-primary text-sm">
                {t("senderWhatsapp")}
              </Label>
              <Input
                id="sender_whatsapp"
                type="tel"
                value={draft.whatsapp}
                onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })}
                className="mt-1.5"
                autoComplete="tel"
                hasError={!!errors.sender_whatsapp}
              />
              {renderError("sender_whatsapp")}
            </div>
          )}

          <div className="sm:col-span-2">
            <Label htmlFor="sender_email" className="text-text-primary text-sm">
              {t("senderEmail")}
            </Label>
            <Input
              id="sender_email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="mt-1.5"
              autoComplete="email"
              hasError={!!errors.sender_email}
            />
            {renderError("sender_email")}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="sender_city" className="text-text-primary text-sm">
              {t("senderCity")}
            </Label>
            <Input
              id="sender_city"
              value={draft.city ?? ""}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className="mt-1.5"
              autoComplete="address-level2"
              placeholder={t("senderCityPlaceholder")}
              maxLength={100}
            />
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              {t("senderCancel")}
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={attemptSave}>
              {t("senderSave")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function SenderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-text-muted text-xs">{label}</dt>
      <dd className="text-text-primary text-sm">{value || "—"}</dd>
    </div>
  );
}

function joinName(sender: SenderSectionProps["sender"]): string {
  if (!sender) return "";
  return [sender.firstName, sender.lastName].filter(Boolean).join(" ");
}
