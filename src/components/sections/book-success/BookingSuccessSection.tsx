"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button, CardBody, CardShell, SectionContainer } from "@/components/atoms";
import { useBookingStore } from "@/hooks/use-booking-store";
import { Link } from "@/i18n/navigation";

type ShipmentConfirmation = {
  id: string;
  tracking_id: string;
  qr_code_url: string | null;
  status: string;
  parcel_size: string;
  weight_kg: number;
  delivery_mode: string;
  delivery_speed: string;
  price_cents: number;
  created_at: string;
  origin_pickup_point: { name: string; address: string; city: string | null } | null;
  destination_pickup_point: { name: string; address: string; city: string | null } | null;
};

export function BookingSuccessSection() {
  const t = useTranslations("bookingSuccess");
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { reset } = useBookingStore();

  const [shipment, setShipment] = useState<ShipmentConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reset();

    if (!sessionId) {
      setLoading(false);
      setError(true);
      return;
    }

    async function load() {
      const url = `/api/shipments/by-session?session_id=${encodeURIComponent(sessionId!)}`;
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;

        if (json.data) {
          setShipment(json.data);
          setLoading(false);
          return;
        }

        // Webhook may not have fired yet — retry once after 3 s
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (cancelled) return;

        const res2 = await fetch(url);
        const json2 = await res2.json();
        if (cancelled) return;
        if (json2.data) setShipment(json2.data);
        else setError(true);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <span className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <SectionContainer className="py-24 text-center">
        <p className="text-text-muted">{t("loadError")}</p>
        <Link href="/customer" className="text-primary-500 mt-4 inline-block">
          {t("viewShipments")}
        </Link>
      </SectionContainer>
    );
  }

  return (
    <div className="bg-secondary-100 px-4 py-24 sm:px-6 lg:px-10">
      <SectionContainer>
        <div className="mx-auto max-w-lg space-y-8 text-center">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="bg-success-100 flex h-20 w-20 items-center justify-center rounded-full">
              <svg
                className="text-success-600 h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <div>
            <h1 className="font-display text-text-primary text-3xl font-bold">{t("title")}</h1>
            <p className="text-text-muted mt-2 text-lg">{t("subtitle")}</p>
          </div>

          {/* Tracking ID card */}
          <CardShell>
            <CardBody className="space-y-4 text-center">
              <p className="text-text-muted text-sm">{t("trackingIdLabel")}</p>
              <p className="font-display text-primary-600 text-2xl font-bold tracking-wider">
                {shipment.tracking_id}
              </p>

              {/* QR code */}
              {shipment.qr_code_url && (
                <div className="flex justify-center">
                  <Image
                    src={shipment.qr_code_url}
                    alt={t("qrAlt")}
                    width={200}
                    height={200}
                    className="rounded-lg"
                  />
                </div>
              )}

              {/* Pickup points */}
              <div className="mt-4 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
                {shipment.origin_pickup_point && (
                  <div>
                    <p className="text-text-muted text-xs font-medium tracking-wide uppercase">
                      {t("dropOff")}
                    </p>
                    <p className="mt-1 font-medium">{shipment.origin_pickup_point.name}</p>
                    <p className="text-text-muted text-sm">
                      {shipment.origin_pickup_point.address}
                    </p>
                  </div>
                )}
                {shipment.destination_pickup_point && (
                  <div>
                    <p className="text-text-muted text-xs font-medium tracking-wide uppercase">
                      {t("pickupAt")}
                    </p>
                    <p className="mt-1 font-medium">{shipment.destination_pickup_point.name}</p>
                    <p className="text-text-muted text-sm">
                      {shipment.destination_pickup_point.address}
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </CardShell>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={`/tracking/${shipment.tracking_id}`}>
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                {t("trackShipment")}
              </Button>
            </Link>
            <Link href="/customer">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                {t("viewShipments")}
              </Button>
            </Link>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}
