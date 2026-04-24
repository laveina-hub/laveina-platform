import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import type Stripe from "stripe";

import { getInsuranceCostCents } from "@/constants/insurance-tiers";
import { env } from "@/env";
import { routing as i18nRouting } from "@/i18n/routing";
import { getClientIp, paymentLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listActivePresets } from "@/services/parcel-preset.service";
import { type PendingBookingV2 } from "@/services/pending-booking";
import { quoteShipmentPrices, resolveParcelForPricing } from "@/services/pricing.service";
import { getDeliveryMode, isBarcelonaRoute } from "@/services/routing.service";
import { createCheckoutSchema } from "@/validations/shipment.schema";

// Real Stripe Checkout Session for M2 bookings (A1–A3).
//
// Wire contract (client → server): `createCheckoutSchema`. The client
// supplies parcels with preset_slug or custom dims + declared_value_cents;
// the server recalculates every price via `quoteShipmentPrices` (no
// client-supplied prices trusted) and stores the M2 pending_booking JSON.
//
// Pricing rules (Q15.2):
//   - Barcelona route (both postcodes 08xxx, routing.mode === "internal"):
//     reads `bcn_price_{preset}_{speed}_cents` from admin_settings (ex-VAT
//     matrix).
//   - Rest of Spain (routing.mode === "sendcloud"): live SendCloud rate (ex-VAT)
//     + admin-configurable margin (default 25%) + floor.
//   - Insurance is per-parcel (ex-VAT) and is included in the VAT base:
//     Subtotal = Delivery + Insurance, VAT = 21% × Subtotal, Total = Subtotal + VAT.
//
// Speed auto-switch:
//   - Per A2: Next Day is Barcelona-only. If the client asks for `next_day`
//     on a non-BCN route, the server forces `express` (the UI already does
//     this but we re-verify server-side in case of tampering).

const SUPABASE_BUCKET = "qr-codes"; // unused here but documents dependencies
void SUPABASE_BUCKET;

type Line = {
  parcel_index: number;
  preset_slug: string;
  /** Full per-parcel total paid by the customer (shipping + insurance + VAT)
   *  per Q15.2 — Stripe's unit_amount for this line. */
  price_cents: number;
  /** Ex-VAT insurance tier cost (kept for the invoice breakdown). */
  insurance_cost_cents: number;
  carrier_rate_cents: number | null;
  margin_percent: number | null;
  shipping_method_id: number | null;
  shipping_option_code: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = paymentLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    if (!env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe.notConfigured" }, { status: 503 });
    }

    // Auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Body validation
    const body = await request.json();
    const parsed = createCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Normalise the locale sent by the wizard so we can persist it with the
    // pending booking (used for email localisation after the webhook fires) and
    // forward it to Stripe Checkout.
    const headerLocale = request.headers.get("x-locale");
    // SAFETY: narrowed by i18nRouting.locales.includes() — the cast only runs
    // when the header value matches one of the configured locale strings.
    const locale = (i18nRouting.locales as readonly string[]).includes(headerLocale ?? "")
      ? (headerLocale as (typeof i18nRouting.locales)[number])
      : i18nRouting.defaultLocale;

    // Route + speed resolution
    const routing = getDeliveryMode(input.origin_postcode, input.destination_postcode);
    if (routing.mode === "blocked") {
      return NextResponse.json({ error: "route.blocked", reason: routing.reason }, { status: 422 });
    }

    // A2 UPDATED server guard — force next_day → express when route isn't BCN→BCN.
    let actualSpeed: "standard" | "express" | "next_day" = input.delivery_speed;
    if (
      actualSpeed === "next_day" &&
      !isBarcelonaRoute(input.origin_postcode, input.destination_postcode)
    ) {
      actualSpeed = "express";
    }

    // Pricing — server-authoritative. We re-quote every parcel here instead of
    // trusting the client's displayed price; the /quote endpoint is a hint,
    // this is the billable truth. Same `quoteShipmentPrices` service backs
    // both paths, so BCN and SendCloud flow through identical math.
    const presetsResult = await listActivePresets();
    if (presetsResult.error || presetsResult.data.length === 0) {
      return NextResponse.json({ error: "presets.notConfigured" }, { status: 503 });
    }
    const presets = presetsResult.data;

    // Resolve every parcel (preset band, billable weight, effective dims,
    // insurance) up front so we can send the whole order to the pricing
    // service in one bundled call. Matches the /quote endpoint and ensures
    // both paths charge identical amounts.
    type ResolvedLine = {
      index: number;
      presetSlug: "mini" | "small" | "medium" | "large";
      billableWeightKg: number;
      lengthCm: number | undefined;
      widthCm: number | undefined;
      heightCm: number | undefined;
      insuranceCostCents: number;
    };

    const resolvedLines: ResolvedLine[] = [];
    for (let i = 0; i < input.parcels.length; i++) {
      const parcel = input.parcels[i];
      const resolved = resolveParcelForPricing(
        {
          presetSlug: parcel.preset_slug,
          weightKg: parcel.weight_kg,
          lengthCm: parcel.length_cm ?? null,
          widthCm: parcel.width_cm ?? null,
          heightCm: parcel.height_cm ?? null,
        },
        presets,
        routing.mode
      );
      if (!resolved) {
        return NextResponse.json(
          { error: "parcel.unresolvable", parcel_index: i },
          { status: 422 }
        );
      }

      const declaredValueCents = parcel.declared_value_cents ?? 0;
      const insuranceCostCents = getInsuranceCostCents(declaredValueCents);

      const presetRow = presets.find((p) => p.slug === resolved.presetSlug);
      resolvedLines.push({
        index: i,
        presetSlug: resolved.presetSlug,
        billableWeightKg: resolved.billableWeightKg,
        lengthCm: parcel.length_cm ?? presetRow?.lengthCm,
        widthCm: parcel.width_cm ?? presetRow?.widthCm,
        heightCm: parcel.height_cm ?? presetRow?.heightCm,
        insuranceCostCents,
      });
    }

    // One bundled quote for the whole order. SendCloud path hits
    // `/shipping-options` with all parcels in a single call; BCN path iterates
    // the matrix per parcel — both return per-parcel PriceOptions in order.
    const quote = await quoteShipmentPrices({
      deliveryMode: routing.mode,
      parcels: resolvedLines.map((r) => ({
        presetSlug: r.presetSlug,
        weightKg: r.billableWeightKg,
        lengthCm: r.lengthCm,
        widthCm: r.widthCm,
        heightCm: r.heightCm,
        insuranceSurchargeCents: r.insuranceCostCents,
      })),
      originPostcode: input.origin_postcode,
      destinationPostcode: input.destination_postcode,
    });

    if (quote.error) {
      const status = quote.error.status ?? 503;
      return NextResponse.json({ error: quote.error.message }, { status });
    }

    const lines: Line[] = [];
    for (let i = 0; i < resolvedLines.length; i++) {
      const r = resolvedLines[i];
      const option = quote.data.parcels[i].options[actualSpeed];
      if (!option) {
        return NextResponse.json(
          {
            error: "pricing.speedUnavailable",
            speed: actualSpeed,
            parcel_index: r.index,
          },
          { status: 422 }
        );
      }

      // Persist the full per-parcel total (shipping + insurance + VAT) per
      // Q15.2. Stripe's unit_amount reads this directly; the webhook copies
      // it into `shipments.price_cents`; invoice views derive the VAT split
      // backwards from this amount.
      lines.push({
        parcel_index: r.index,
        preset_slug: r.presetSlug,
        price_cents: option.totalCents,
        insurance_cost_cents: r.insuranceCostCents,
        carrier_rate_cents: option.carrierRateCents > 0 ? option.carrierRateCents : null,
        margin_percent: option.marginPercent > 0 ? option.marginPercent : null,
        shipping_method_id: option.shippingMethodId,
        shipping_option_code: option.shippingOptionCode,
      });
    }

    // Persist pending_booking in M2 shape.
    const pending: PendingBookingV2 = {
      version: "m2",
      delivery_mode: routing.mode,
      actual_speed: actualSpeed,
      locale,
      sender: {
        first_name: input.sender_first_name,
        last_name: input.sender_last_name,
        phone: input.sender_phone,
        whatsapp: input.sender_whatsapp ?? null,
        email: input.sender_email,
      },
      receiver: {
        first_name: input.receiver_first_name,
        last_name: input.receiver_last_name,
        phone: input.receiver_phone,
        whatsapp: input.receiver_whatsapp ?? null,
        email: input.receiver_email,
      },
      origin: {
        postcode: input.origin_postcode,
        pickup_point_id: input.origin_pickup_point_id,
      },
      destination: {
        postcode: input.destination_postcode,
        pickup_point_id: input.destination_pickup_point_id,
      },
      parcels: input.parcels.map((parcel, i) => {
        const line = lines[i];
        // Preset dimensions are applied server-side later (webhook) when we
        // resolve the preset row — the UI-supplied values here are only
        // informational. We still keep them here for reproducibility. For
        // custom-size parcels (preset_slug: null on input), the resolver
        // mapped them to a preset via billable weight and `line.preset_slug`
        // now holds the canonical slug.
        return {
          preset_slug: line.preset_slug as "mini" | "small" | "medium" | "large",
          weight_kg: parcel.weight_kg,
          length_cm: parcel.length_cm ?? 0,
          width_cm: parcel.width_cm ?? 0,
          height_cm: parcel.height_cm ?? 0,
          declared_value_cents: parcel.declared_value_cents ?? 0,
          insurance_cost_cents: line.insurance_cost_cents,
          price_cents: line.price_cents,
          carrier_rate_cents: line.carrier_rate_cents,
          margin_percent: line.margin_percent,
          shipping_method_id: line.shipping_method_id,
          shipping_option_code: line.shipping_option_code,
        };
      }),
    };

    const adminSupabase = createAdminClient();
    const { data: pendingRow, error: pendingError } = await adminSupabase
      .from("pending_bookings")
      .insert({
        customer_id: user.id,
        booking_data: pending,
        processed: false,
      })
      .select("id")
      .single();

    if (pendingError || !pendingRow) {
      console.error("create-checkout: pending_bookings insert failed", pendingError);
      return NextResponse.json({ error: "pending.insertFailed" }, { status: 500 });
    }

    // Stripe Checkout Session — reuses the already-normalised `locale` so the
    // hosted Stripe page matches what the wizard sent and what we persisted.
    const appUrl = env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    const [tCheckout, tPresets] = await Promise.all([
      getTranslations({ locale, namespace: "stripeCheckout" }),
      getTranslations({ locale, namespace: "parcelPresets" }),
    ]);
    const speedLabel = tCheckout(`speed.${actualSpeed}`);
    const multiParcel = input.parcels.length > 1;

    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lines.map((line, i) => {
      // `line.price_cents` already includes shipping + insurance + VAT per Q15.2.
      const unitAmount = line.price_cents;
      const presetLabel = tPresets(`${line.preset_slug}.name`);
      const name = multiParcel
        ? tCheckout("nameWithIndex", { index: i + 1, preset: presetLabel })
        : tCheckout("nameSingle", { preset: presetLabel });
      const description =
        line.insurance_cost_cents > 0
          ? tCheckout("descriptionWithInsurance", { speed: speedLabel })
          : tCheckout("descriptionWithoutInsurance", { speed: speedLabel });
      return {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: unitAmount,
          product_data: {
            name,
            description,
          },
        },
      };
    });

    // Stripe Checkout supports es/en but not ca — fall back to es for Catalan
    // users so the hosted UI chrome doesn't silently revert to English.
    const stripeLocale: Stripe.Checkout.SessionCreateParams.Locale =
      locale === "ca" ? "es" : locale;

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: stripeLineItems,
      customer_email: input.sender_email,
      locale: stripeLocale,
      success_url: `${appUrl}/${locale}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${locale}/book?payment_cancelled=true`,
      metadata: {
        pending_booking_id: pendingRow.id,
        customer_id: user.id,
      },
    });

    if (!session.url) {
      console.error("create-checkout: stripe session missing url", session.id);
      return NextResponse.json({ error: "stripe.sessionMissingUrl" }, { status: 500 });
    }

    return NextResponse.json({ data: { url: session.url, session_id: session.id } });
  } catch (err) {
    console.error("create-checkout failed:", err);
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
