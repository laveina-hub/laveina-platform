"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { SenderProfileSeed } from "@/app/[locale]/(public)/book/page";
import { Button, Checkbox, Input, Label } from "@/components/atoms";
import {
  BoxIcon,
  BriefcaseIcon,
  ChevronIcon,
  FootprintsIcon,
  InfoIcon,
  MapPinIcon,
  PackageIcon,
  SpinnerIcon,
  WeightIcon,
} from "@/components/icons";
import { type ParcelPreset, type ParcelPresetSlug } from "@/constants/parcel-sizes";
import { useBookingStore } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { useQuote } from "@/hooks/use-quote";
import { formatCents } from "@/lib/format";
import {
  bookingSenderUiSchema,
  bookingStepRecipientUiSchema,
  type BookingStepRecipientUiInput,
} from "@/validations/shipment.schema";

import { flattenSenderErrors, SenderSection } from "./Step3Recipient.SenderSection";

type Props = {
  presets: ParcelPreset[];
  /** A4 — sender seed from profile. Null for guests → sender section hidden. */
  senderProfile: SenderProfileSeed | null;
};

const ICON_BY_SLUG: Record<ParcelPresetSlug, ComponentType<{ className?: string }>> = {
  mini: BoxIcon,
  small: FootprintsIcon,
  medium: WeightIcon,
  large: BriefcaseIcon,
};

export function Step3Recipient({ presets, senderProfile }: Props) {
  const t = useTranslations("booking");
  const tPresets = useTranslations("parcelPresets");
  const tv = useTranslations("validation");
  const {
    parcels,
    origin,
    destination,
    recipient,
    sender,
    quote,
    setRecipient,
    hydrateSenderFromProfile,
    updateSender,
    setStep,
    pendingRecipientErrors,
    setPendingRecipientErrors,
    pendingSenderErrors,
    setPendingSenderErrors,
  } = useBookingStore();

  const activePreset = useMemo(
    () => presets.find((p) => p.slug === parcels[0]?.preset_slug) ?? null,
    [presets, parcels]
  );
  const PresetIcon = activePreset ? ICON_BY_SLUG[activePreset.slug] : null;
  const isMultiParcel = parcels.length > 1;

  // Defense-in-depth re-quote: Step 2's gate guarantees a quote exists when
  // the user first lands here, but back-nav (Step 3 → Step 4 → Step 3) and
  // store invalidations (parcel/origin/destination edits) can null it again.
  // Mirrors Step 4's pattern so the figures shown here match what Pay charges.
  const quoteQuery = useQuote({
    originPostcode: origin?.postcode ?? null,
    destinationPostcode: destination?.postcode ?? null,
    parcels,
  });
  const isQuoting = quoteQuery.isFetching && !quote;

  // Pricing source: ALWAYS the server-issued `quote` snapshot. We do NOT fall
  // back to local BCN matrix defaults — falling back leaks BCN prices into
  // SendCloud routes when the quote is null mid-flow, which the customer
  // would mis-see as a fixed price unrelated to their actual route. While the
  // quote is loading we render a "Calculating…" placeholder instead.
  const standardPricePrimary: number | null = quote?.parcels[0]?.totalCents.standard ?? null;

  const lineItems = useMemo(() => {
    if (!quote) return [];
    return parcels.flatMap((_parcel, index) => {
      const quoteParcel = quote.parcels[index];
      if (!quoteParcel) return [];
      const presetRow = presets.find((p) => p.slug === quoteParcel.presetSlug);
      if (!presetRow) return [];
      return [{ preset: presetRow, priceCents: quoteParcel.totalCents.standard ?? 0 }];
    });
  }, [parcels, presets, quote]);

  const totalCents = quote?.totals.standard ?? null;

  // Multi-parcel: headline = total. Single: headline = the parcel's price.
  // Showing the first parcel's price when there are 5 misrepresents the
  // shipment cost (Mini at €5 reads as the whole order, not 1/5 of it).
  const headerPriceCents: number | null = isMultiParcel ? totalCents : standardPricePrimary;

  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const originPointsQuery = usePickupPoints(origin?.postcode);
  const destinationPointsQuery = usePickupPoints(destination?.postcode);
  const originPoint = originPointsQuery.data?.find((p) => p.id === origin?.pickupPointId);
  const destinationPoint = destinationPointsQuery.data?.find(
    (p) => p.id === destination?.pickupPointId
  );

  // A4 — seed the sender from the profile on first mount, but never stomp a
  // local override (store action guards on sender.overriddenLocally).
  useEffect(() => {
    if (!senderProfile) return;
    hydrateSenderFromProfile(senderProfile);
  }, [senderProfile, hydrateSenderFromProfile]);

  const [senderEditing, setSenderEditing] = useState(false);

  const whatsappSameDefault =
    recipient && recipient.whatsapp && recipient.whatsapp !== recipient.phone ? false : true;

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<BookingStepRecipientUiInput>({
    resolver: zodResolver(bookingStepRecipientUiSchema),
    // `onTouched` validates a field after its first blur and then live on
    // every keystroke — lenient on initial entry, immediate feedback once the
    // user has corrected a mistake (and matches the same UX as receiving a
    // server-flagged error from a failed Pay attempt below).
    mode: "onTouched",
    defaultValues: {
      receiver_first_name: recipient?.firstName ?? "",
      receiver_last_name: recipient?.lastName ?? "",
      receiver_phone: recipient?.phone ?? "",
      receiver_whatsapp_same_as_phone: whatsappSameDefault,
      receiver_whatsapp:
        recipient?.whatsapp && recipient.whatsapp !== recipient.phone ? recipient.whatsapp : "",
      receiver_email: recipient?.email ?? "",
    },
  });

  const whatsappSameAsPhone = watch("receiver_whatsapp_same_as_phone");

  // Apply server-flagged recipient errors handed off from a failed Pay click
  // on Step 4. We `setError` per field so the same inline error UI used for
  // client validation renders the messages, then scroll + focus the first
  // offending input and clear the pending state so a re-render won't re-apply
  // stale errors after the user starts typing.
  useEffect(() => {
    if (!pendingRecipientErrors) return;
    const fieldEntries = Object.entries(pendingRecipientErrors) as Array<
      [keyof BookingStepRecipientUiInput, string]
    >;
    if (fieldEntries.length === 0) {
      setPendingRecipientErrors(null);
      return;
    }
    fieldEntries.forEach(([field, message]) => {
      setError(field, { type: "server", message });
    });

    const [firstField] = fieldEntries[0];
    requestAnimationFrame(() => {
      const el = document.getElementById(firstField);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      }
    });

    setPendingRecipientErrors(null);
  }, [pendingRecipientErrors, setError, setPendingRecipientErrors]);

  function onSubmit(data: BookingStepRecipientUiInput) {
    // The recipient form's zodResolver has already validated this payload.
    // Before advancing we still have to gate on sender state, otherwise a
    // user with a stale profile or a half-edited sender section reaches the
    // server validator on Pay click and gets a generic toast instead of an
    // inline correction here.
    if (senderProfile) {
      // 1. Don't drop a half-edited draft on the floor by silently advancing.
      if (senderEditing) {
        toast.error(t("senderSaveBeforeContinue"));
        document
          .getElementById("sender_first_name")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // 2. Validate the persisted sender against the same shape the server
      //    uses on `/api/shipments/create-checkout`. Catches incomplete
      //    profiles (e.g. missing phone) before they get to Stripe.
      const senderResult = bookingSenderUiSchema.safeParse({
        sender_first_name: sender?.firstName ?? "",
        sender_last_name: sender?.lastName ?? "",
        sender_phone: sender?.phone ?? "",
        sender_whatsapp_same_as_phone: !sender?.whatsapp || sender.whatsapp === sender.phone,
        sender_whatsapp:
          sender?.whatsapp && sender.whatsapp !== sender.phone ? sender.whatsapp : "",
        sender_email: sender?.email ?? "",
      });
      if (!senderResult.success) {
        const fieldErrors = flattenSenderErrors(senderResult.error.flatten().fieldErrors);
        setPendingSenderErrors(fieldErrors);
        toast.error(t("senderReviewRequired"));
        return;
      }
    }

    setRecipient({
      firstName: data.receiver_first_name,
      lastName: data.receiver_last_name,
      phone: data.receiver_phone,
      whatsapp: data.receiver_whatsapp_same_as_phone
        ? data.receiver_phone
        : (data.receiver_whatsapp ?? ""),
      email: data.receiver_email,
    });
    setStep(4);
  }

  const multiParcelCount = parcels.length;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <section
        aria-label={t("summaryParcelLabel")}
        className="bg-bg-muted border-border-muted flex flex-col gap-3 rounded-lg border px-5 py-3"
      >
        {/* Header: content-aware so the headline reflects what the user is
            actually buying. Single parcel → that parcel's icon, name, and
            price. Multi-parcel → generic shipment icon, "N parcels" count,
            and the SHIPMENT total (showing the first parcel's price as the
            headline misrepresents the cart by ~5×). */}
        {activePreset && (PresetIcon || isMultiParcel) && (
          <div className="flex items-center gap-3">
            <div className="bg-primary-50 text-primary-600 flex items-center justify-center rounded-lg p-2">
              {isMultiParcel ? (
                <PackageIcon className="h-6 w-6" aria-hidden />
              ) : (
                PresetIcon && <PresetIcon className="h-6 w-6" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-text-muted text-base leading-6 font-medium">
                {isMultiParcel
                  ? t("parcelCountTitle", { count: multiParcelCount })
                  : tPresets(`${activePreset.slug}.name`)}
              </p>
              {headerPriceCents !== null ? (
                <>
                  <p className="text-text-primary text-xl leading-7 font-semibold">
                    {isMultiParcel
                      ? t("fromPriceTotal", { price: formatCents(headerPriceCents) })
                      : t("fromPrice", { price: formatCents(headerPriceCents) })}
                  </p>
                  <p className="text-text-muted mt-0.5 text-xs italic">
                    {t("fromPriceFootnoteStep3")}
                  </p>
                </>
              ) : isQuoting ? (
                <p className="text-text-muted inline-flex items-center gap-2 text-base leading-6 font-medium">
                  <SpinnerIcon className="h-4 w-4 animate-spin" aria-hidden />
                  {t("calculatingPrice")}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Q8.1 — multi-parcel summary: route hint + expandable per-parcel
            breakdown. Count + total live in the header above, so this block
            no longer duplicates them — it just contextualizes the shipment
            ("shipping N together to X") and surfaces the breakdown on demand.
            flex-col stack so the info line and the toggle each get their own
            row even on narrow widths. */}
        {multiParcelCount > 1 && (
          <div className="bg-primary-50/70 mb-3 flex flex-col gap-2 rounded-xl p-3">
            {destinationPoint && (
              <p className="text-primary-900 flex items-start gap-2 text-xs font-medium">
                <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  {t("multiparcelShippingTogether", {
                    count: multiParcelCount,
                    destination: destinationPoint.name,
                  })}
                </span>
              </p>
            )}

            <button
              type="button"
              onClick={() => setSummaryExpanded((v) => !v)}
              aria-expanded={summaryExpanded}
              className="text-primary-700 hover:text-primary-800 inline-flex w-fit items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline"
            >
              {summaryExpanded ? t("summaryCollapse") : t("summaryViewDetails")}
              <ChevronIcon direction={summaryExpanded ? "up" : "down"} className="h-3 w-3" />
            </button>

            {summaryExpanded && (
              <ul className="border-primary-200 divide-primary-200 flex flex-col divide-y border-t pt-1 text-sm">
                {lineItems.map((item, index) => (
                  <li
                    key={`${item.preset.slug}-${index}`}
                    className="flex items-center justify-between py-2 first:pt-2"
                  >
                    <span className="text-text-primary">
                      {t("summaryLineItem", {
                        index: index + 1,
                        preset: tPresets(`${item.preset.slug}.name`),
                      })}
                    </span>
                    <span className="text-text-primary font-medium tabular-nums">
                      {formatCents(item.priceCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(originPoint || destinationPoint) && (
          <div className="border-border-muted flex flex-col gap-3 rounded-lg border bg-white p-5">
            <p className="text-text-muted text-sm leading-5.5 font-medium">
              {t("summaryRouteLabel")}
            </p>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="border-border-default h-4 w-4 shrink-0 rounded-full border-2 bg-white"
                />
                <p className="text-text-primary text-base leading-6 font-medium">
                  {originPoint?.name ?? "—"}
                </p>
              </div>
              <div
                aria-hidden
                className="border-border-default ml-1.75 h-5.5 border-l-2 border-dashed"
              />
              <div className="flex items-center gap-3">
                <MapPinIcon className="text-primary-500 h-4 w-4 shrink-0" />
                <p className="text-text-primary text-base leading-6 font-medium">
                  {destinationPoint?.name ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {senderProfile && (
        <SenderSection
          sender={sender}
          editing={senderEditing}
          setEditing={setSenderEditing}
          onSave={(patch) => {
            updateSender(patch);
            setSenderEditing(false);
            setPendingSenderErrors(null);
          }}
          onCancel={() => setSenderEditing(false)}
          pendingErrors={pendingSenderErrors}
          clearPendingErrors={() => setPendingSenderErrors(null)}
        />
      )}

      <section className="border-border-muted rounded-2xl border bg-white p-5 sm:p-6">
        <h2 className="text-text-primary mb-5 text-base font-semibold">
          {t("recipientFormTitle")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="receiver_first_name" className="text-text-primary text-sm">
              {t("recipientFirstName")}
            </Label>
            <Input
              id="receiver_first_name"
              placeholder={t("recipientFirstNamePlaceholder")}
              autoComplete="given-name"
              hasError={!!errors.receiver_first_name}
              {...register("receiver_first_name")}
              className="mt-1.5"
            />
            {errors.receiver_first_name?.message && (
              <p role="alert" className="text-error mt-1 text-xs">
                {tv(errors.receiver_first_name.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="receiver_last_name" className="text-text-primary text-sm">
              {t("recipientLastName")}
            </Label>
            <Input
              id="receiver_last_name"
              placeholder={t("recipientLastNamePlaceholder")}
              autoComplete="family-name"
              hasError={!!errors.receiver_last_name}
              {...register("receiver_last_name")}
              className="mt-1.5"
            />
            {errors.receiver_last_name?.message && (
              <p role="alert" className="text-error mt-1 text-xs">
                {tv(errors.receiver_last_name.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="receiver_phone" className="text-text-primary text-sm">
              {t("recipientPhone")}
            </Label>
            <Input
              id="receiver_phone"
              type="tel"
              placeholder={t("recipientPhonePlaceholder")}
              autoComplete="tel"
              hasError={!!errors.receiver_phone}
              {...register("receiver_phone")}
              className="mt-1.5"
            />
            {errors.receiver_phone?.message && (
              <p role="alert" className="text-error mt-1 text-xs">
                {tv(errors.receiver_phone.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Checkbox
              id="receiver_whatsapp_same_as_phone"
              label={t("recipientWhatsappSameAsPhone")}
              {...register("receiver_whatsapp_same_as_phone")}
            />
          </div>

          {!whatsappSameAsPhone && (
            <div className="sm:col-span-2">
              <Label htmlFor="receiver_whatsapp" className="text-text-primary text-sm">
                {t("recipientWhatsapp")}
              </Label>
              <Input
                id="receiver_whatsapp"
                type="tel"
                placeholder={t("recipientWhatsappPlaceholder")}
                autoComplete="tel"
                hasError={!!errors.receiver_whatsapp}
                {...register("receiver_whatsapp")}
                className="mt-1.5"
              />
              {errors.receiver_whatsapp?.message && (
                <p role="alert" className="text-error mt-1 text-xs">
                  {tv(errors.receiver_whatsapp.message.replace("validation.", ""))}
                </p>
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            <Label htmlFor="receiver_email" className="text-text-primary text-sm">
              {t("recipientEmail")}
            </Label>
            <Input
              id="receiver_email"
              type="email"
              placeholder={t("recipientEmailPlaceholder")}
              autoComplete="email"
              hasError={!!errors.receiver_email}
              {...register("receiver_email")}
              className="mt-1.5"
            />
            {errors.receiver_email?.message && (
              <p role="alert" className="text-error mt-1 text-xs">
                {tv(errors.receiver_email.message.replace("validation.", ""))}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="rounded-xl px-5 py-2.5 text-base font-semibold"
        >
          {t("next")}
          <ChevronIcon direction="right" className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
