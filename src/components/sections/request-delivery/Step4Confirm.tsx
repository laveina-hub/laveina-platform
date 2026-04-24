"use client";

import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";

import { Button } from "@/components/atoms";
import {
  BoxIcon,
  BriefcaseIcon,
  FootprintsIcon,
  LockIcon,
  MapPinIcon,
  MastercardIcon,
  NavigationIcon,
  StripeIcon,
  VisaIcon,
  WeightIcon,
} from "@/components/icons";
import { InsuranceSection, SpeedSelector } from "@/components/molecules";
import { type CutoffConfig } from "@/constants/cutoff-times";
import { getInsuranceCostCents } from "@/constants/insurance-tiers";
import { type ParcelPreset, type ParcelPresetSlug } from "@/constants/parcel-sizes";
import { useBookingStore, type DeliverySpeed } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isBarcelonaRoute } from "@/services/routing.service";

// Step 4 — Review & Payment (client Final A2, 2026-04-23):
// - Speed is picked on this step, after the route is known. Per Final A2,
//   BCN → BCN routes show Standard / Express / Next Day; any other route
//   shows Standard / Express only (Next Day is hidden, not disabled).
// - `bcnPrices` are VAT-inclusive (matches Step 1's "From €X.XX"), so per-parcel
//   line items = preset × speed, summed into a subtotal. Insurance (A3) is
//   per-parcel and added on top; VAT is derived backwards from the delivery
//   subtotal only.
// - Speed displayed is `actualSpeed ?? requestedSpeed` so an auto-switched
//   Next Day → Express shows Express (happens if user goes back to Step 2
//   and changes destination to a non-BCN postcode).
//
// Q15.2 — Pricing formula:
//   Subtotal = Delivery + Insurance    (both ex-VAT)
//   VAT      = 21% × Subtotal          (insurance sits inside the VAT base)
//   Total    = Subtotal + VAT

const IVA_RATE = 0.21;

type BcnPricesCents = Record<
  ParcelPresetSlug,
  { standard: number; express: number; next_day: number }
>;

type Props = {
  presets: ParcelPreset[];
  bcnPrices: BcnPricesCents;
  cutoffConfig: CutoffConfig;
};

const PRESET_ICON_BY_SLUG: Record<ParcelPresetSlug, ComponentType<{ className?: string }>> = {
  mini: BoxIcon,
  small: FootprintsIcon,
  medium: WeightIcon,
  large: BriefcaseIcon,
};

export function Step4Confirm({ presets, bcnPrices, cutoffConfig }: Props) {
  const t = useTranslations("booking");
  const tPresets = useTranslations("parcelPresets");
  const locale = useLocale();
  const {
    parcels,
    origin,
    destination,
    sender,
    recipient,
    requestedSpeed,
    actualSpeed,
    quote,
    setRequestedSpeed,
    updateParcel,
    setStep,
  } = useBookingStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // actualSpeed wins when the route forced an auto-switch on Step 2 (Next Day
  // → Express when destination moves outside Barcelona).
  const speed: DeliverySpeed = actualSpeed ?? requestedSpeed ?? "standard";

  const originPointsQuery = usePickupPoints(origin?.postcode);
  const destinationPointsQuery = usePickupPoints(destination?.postcode);
  const originPoint = originPointsQuery.data?.find((p) => p.id === origin?.pickupPointId);
  const destinationPoint = destinationPointsQuery.data?.find(
    (p) => p.id === destination?.pickupPointId
  );

  // Primary parcel drives the headline size card; later parcels surface in
  // the multi-parcel breakdown below.
  const primaryPreset = useMemo(
    () => presets.find((p) => p.slug === parcels[0]?.preset_slug) ?? null,
    [presets, parcels]
  );
  const PrimaryIcon = primaryPreset ? PRESET_ICON_BY_SLUG[primaryPreset.slug] : BoxIcon;

  // Route-aware line items (ex-VAT per parcel):
  //   - BCN route → read directly from the ex-VAT matrix.
  //   - SendCloud route → read `shippingCents` from the quote snapshot
  //     (ex-VAT carrier rate × margin × floor).
  // Custom-dimension parcels resolve via the quote snapshot's billable-weight
  // mapping; falling back to preset_slug keeps BCN working when the quote
  // hasn't landed yet (e.g. back-navigation re-render).
  const lineItems = useMemo(() => {
    return parcels
      .map((parcel, index) => {
        const quoteParcel = quote?.parcels[index];
        const slug = quoteParcel?.presetSlug ?? parcel.preset_slug;
        if (!slug) return null;
        const preset = presets.find((p) => p.slug === slug);
        if (!preset) return null;

        let shippingExVatCents: number | null = null;
        if (quoteParcel) {
          shippingExVatCents = quoteParcel.shippingCents[speed];
        } else {
          // Fallback: BCN matrix from props while the quote is fetching.
          shippingExVatCents = bcnPrices[preset.slug]?.[speed] ?? null;
        }
        if (shippingExVatCents === null) return null;

        const insuranceCents = getInsuranceCostCents(parcel.declared_value_cents ?? 0);
        return { preset, shippingExVatCents, insuranceCents };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [parcels, presets, bcnPrices, speed, quote]);

  const deliveryCents = lineItems.reduce((sum, item) => sum + item.shippingExVatCents, 0);
  const insuranceTotalCents = lineItems.reduce((sum, item) => sum + item.insuranceCents, 0);
  const subtotalCents = deliveryCents + insuranceTotalCents;
  const vatCents = Math.round(subtotalCents * IVA_RATE);
  const grandTotalCents = subtotalCents + vatCents;

  const hasRequiredData =
    lineItems.length === parcels.length &&
    parcels.length > 0 &&
    !!sender &&
    !!recipient &&
    !!origin?.pickupPointId &&
    !!destination?.pickupPointId;
  const canPay = hasRequiredData && !isSubmitting;

  // Final A2: Next Day is Barcelona-only. Hide the option entirely on any
  // other route. Prefer the quote snapshot's routing decision (server-verified)
  // over the client-side postcode check — both should agree, but the snapshot
  // is authoritative.
  const isBcnRoute =
    quote?.deliveryMode === "internal" ||
    (quote === null && isBarcelonaRoute(origin?.postcode ?? "", destination?.postcode ?? ""));
  const availableSpeeds: readonly DeliverySpeed[] = isBcnRoute
    ? (["standard", "express", "next_day"] as const)
    : (["standard", "express"] as const);

  // Speed selector tiles show the primary parcel's ex-VAT delivery per speed
  // so the user sees the tier delta without the VAT layer folded in. Per
  // Q15.2: "Prices shown: Excluding VAT".
  const quotedPrimary = quote?.parcels[0];
  const primaryPresetSlug = parcels[0]?.preset_slug ?? quotedPrimary?.presetSlug ?? null;
  const priceBySpeed: Record<DeliverySpeed, number | null> = quotedPrimary
    ? quotedPrimary.shippingCents
    : primaryPresetSlug
      ? {
          standard: bcnPrices[primaryPresetSlug]?.standard ?? null,
          express: bcnPrices[primaryPresetSlug]?.express ?? null,
          next_day: bcnPrices[primaryPresetSlug]?.next_day ?? null,
        }
      : { standard: null, express: null, next_day: null };

  async function handlePay() {
    if (!canPay || !sender || !recipient || !origin || !destination) return;
    setIsSubmitting(true);
    try {
      const payload = {
        sender_first_name: sender.firstName,
        sender_last_name: sender.lastName,
        sender_phone: sender.phone,
        sender_whatsapp: sender.whatsapp || sender.phone,
        sender_email: sender.email,

        receiver_first_name: recipient.firstName,
        receiver_last_name: recipient.lastName,
        receiver_phone: recipient.phone,
        receiver_whatsapp: recipient.whatsapp || recipient.phone,
        receiver_email: recipient.email,

        origin_postcode: origin.postcode,
        origin_pickup_point_id: origin.pickupPointId,
        destination_postcode: destination.postcode,
        destination_pickup_point_id: destination.pickupPointId,

        parcels: parcels.map((parcel) => {
          const preset = parcel.preset_slug
            ? presets.find((p) => p.slug === parcel.preset_slug)
            : null;
          return {
            preset_slug: parcel.preset_slug,
            weight_kg: parcel.weight_kg,
            length_cm: preset?.lengthCm ?? parcel.length_cm,
            width_cm: preset?.widthCm ?? parcel.width_cm,
            height_cm: preset?.heightCm ?? parcel.height_cm,
            declared_value_cents: parcel.declared_value_cents ?? 0,
            wants_insurance: parcel.wants_insurance ?? false,
          };
        }),
        delivery_speed: speed,
      };

      const res = await fetch("/api/shipments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(t("paymentFailed"));
        console.error("create-checkout failed:", body);
        setIsSubmitting(false);
        return;
      }

      const json = await res.json();
      const url: string | undefined = json?.data?.url;
      if (!url) {
        toast.error(t("paymentFailed"));
        setIsSubmitting(false);
        return;
      }

      // Stripe hosted checkout — full-page redirect, no SPA nav.
      window.location.href = url;
    } catch (err) {
      console.error("create-checkout threw:", err);
      toast.error(t("paymentFailed"));
      setIsSubmitting(false);
    }
  }

  const primarySubtitle = primaryPreset
    ? `${t("upToWeight", { weight: `${primaryPreset.maxWeightKg}kg` })} | ${t("dimensionsLabel", {
        length: primaryPreset.lengthCm,
        width: primaryPreset.widthCm,
        height: primaryPreset.heightCm,
      })}`
    : undefined;

  const primaryCardTitle = primaryPreset
    ? parcels.length > 1
      ? t("multiparcelCardTitle", {
          primary: tPresets(`${primaryPreset.slug}.name`),
          count: parcels.length,
        })
      : tPresets(`${primaryPreset.slug}.name`)
    : "—";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-text-muted -mt-4 text-sm sm:-mt-6">{t("reviewShipmentSubtitle")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          icon={PrimaryIcon}
          title={primaryCardTitle}
          subtitle={primarySubtitle}
          editLabel={t("editStepSize")}
          onEdit={() => setStep(1)}
          titleClassName="text-base font-semibold"
        />
        <InfoCard
          icon={MapPinIcon}
          title={destinationPoint?.name ?? "—"}
          subtitle={destinationPoint?.address}
          editLabel={t("editStepDestination")}
          onEdit={() => setStep(2)}
        />
        <InfoCard
          icon={NavigationIcon}
          title={originPoint?.name ?? "—"}
          subtitle={originPoint?.address}
          editLabel={t("editStepOrigin")}
          onEdit={() => setStep(2)}
        />
      </div>

      <SpeedSelector
        value={speed}
        onChange={setRequestedSpeed}
        priceBySpeed={priceBySpeed}
        cutoffConfig={cutoffConfig}
        availableSpeeds={availableSpeeds}
      />

      {parcels.length > 1 && lineItems.length > 0 && (
        <section className="border-border-muted rounded-2xl border bg-white p-5">
          <h2 className="text-text-primary mb-3 text-sm font-semibold">
            {t("multiparcelBreakdownTitle")}
          </h2>
          <dl className="divide-border-muted flex flex-col divide-y text-sm">
            {lineItems.map((item, index) => (
              <div
                key={`${item.preset.slug}-${index}`}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <dt className="text-text-primary">
                  {t("multiparcelBreakdownLine", {
                    index: index + 1,
                    preset: tPresets(`${item.preset.slug}.name`),
                  })}
                </dt>
                <dd className="text-text-primary font-medium tabular-nums">
                  {formatCents(item.shippingExVatCents)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <InsuranceSection
        parcels={parcels}
        onChangeParcel={(index, next) => updateParcel(index, next)}
      />

      <section className="border-border-muted flex flex-col gap-4 rounded-2xl border bg-white p-5">
        {/* Q15.2 — Delivery (ex-VAT) → Insurance (ex-VAT) → Subtotal → VAT → Total.
            Subtotal = Delivery + Insurance; VAT = 21% × Subtotal; Total = Subtotal + VAT. */}
        <dl className="flex flex-col gap-3 text-sm">
          <PriceRow
            label={t("priceDelivery")}
            value={deliveryCents > 0 ? formatCents(deliveryCents) : "—"}
          />
          {insuranceTotalCents > 0 && (
            <PriceRow label={t("priceInsurance")} value={formatCents(insuranceTotalCents)} />
          )}
          <div className="border-border-muted border-t pt-3">
            <PriceRow
              label={t("priceSubtotal")}
              value={subtotalCents > 0 ? formatCents(subtotalCents) : "—"}
            />
          </div>
          <PriceRow label={t("priceVat")} value={subtotalCents > 0 ? formatCents(vatCents) : "—"} />
        </dl>

        <div className="bg-primary-50/70 rounded-xl px-4 py-3">
          <p className="text-text-muted text-right text-xs font-medium">{t("priceTotal")}</p>
          <div className="mt-0.5 flex items-baseline justify-between gap-3">
            <span className="text-text-primary text-sm font-medium">{t("priceLine")}</span>
            <span className="text-text-primary text-sm font-semibold tabular-nums">
              {grandTotalCents > 0
                ? t("priceCurrency", { amount: (grandTotalCents / 100).toFixed(2) })
                : "—"}
            </span>
          </div>
        </div>

        <p className="text-text-muted inline-flex items-center gap-2 text-xs">
          <LockIcon className="h-4 w-4" aria-hidden />
          {t("securePaymentNote")}
        </p>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handlePay}
          disabled={!canPay}
          className="w-full"
        >
          {grandTotalCents > 0
            ? t("payButton", { price: formatCents(grandTotalCents) })
            : t("payButton", { price: "—" })}
        </Button>

        {/* Q17.1 — make the auto-save behaviour visible. The booking store
            persists every change to localStorage via Zustand `persist`, so
            closing the tab here doesn't lose anything; users tend to assume
            otherwise without this reassurance copy. */}
        <p className="text-text-muted text-center text-xs">{t("draftAutoSaved")}</p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <StripeBadge />
          <VisaBadge />
          <MastercardBadge />
        </div>
      </section>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

type InfoCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  editLabel?: string;
  onEdit?: () => void;
};

function InfoCard({
  icon: Icon,
  title,
  subtitle,
  titleClassName,
  editLabel,
  onEdit,
}: InfoCardProps) {
  return (
    <div className="border-border-muted relative flex items-start gap-3 rounded-2xl border bg-white p-4">
      <div className="bg-primary-50 text-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-text-primary truncate text-sm font-semibold", titleClassName)}>
          {title}
        </p>
        {subtitle && <p className="text-text-muted truncate text-xs">{subtitle}</p>}
      </div>
      {onEdit && editLabel && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          className="text-text-muted hover:text-primary-600 focus-visible:outline-primary-500 absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-primary font-medium">{label}</dt>
      <dd className="text-text-primary font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// ── payment badges ─────────────────────────────────────────────────────────
// Stripe / VISA / Mastercard only — PayPal was dropped per M2 client
// confirmation. StripeIcon ships with its own gray pill background built
// into its SVG; the other two marks are pure logos and get wrapped in a
// matching gray pill so the row reads as a uniform strip.

const BADGE_BASE =
  "inline-flex h-[28px] w-[44px] items-center justify-center rounded-[4px] border border-[#ECECEC] bg-[#F3F3F3]";

function StripeBadge() {
  return <StripeIcon size={44} className="shrink-0" />;
}

function VisaBadge() {
  return (
    <span className={BADGE_BASE}>
      <VisaIcon size={26} />
    </span>
  );
}

function MastercardBadge() {
  return (
    <span className={BADGE_BASE}>
      <MastercardIcon size={26} />
    </span>
  );
}
