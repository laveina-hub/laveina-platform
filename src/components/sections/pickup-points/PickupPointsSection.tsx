"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Heading, Input, SectionContainer, Text } from "@/components/atoms";
import { StarIcon } from "@/components/icons";
import { GoogleMapsWrapper } from "@/components/molecules/GoogleMapsWrapper";
import {
  usePickupPointRatings,
  type PickupPointRatingSummary,
} from "@/hooks/use-pickup-point-ratings";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { Link } from "@/i18n/navigation";

const PickupPointMap = dynamic(
  () => import("@/components/molecules/PickupPointMap").then((mod) => mod.PickupPointMap),
  { ssr: false, loading: () => <div className="bg-primary-50 h-72 animate-pulse rounded-xl" /> }
);

export function PickupPointsSection() {
  const t = useTranslations("pickupPoints");
  const [postcode, setPostcode] = useState("");
  const [freeText, setFreeText] = useState("");
  // Both inputs commit to the same query state on Search — postcode wins
  // when filled (5-digit exact match), otherwise the free-text path runs an
  // ilike across name/address/city/postcode (Q6.5).
  const [postcodeTerm, setPostcodeTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: points, isFetching } = usePickupPoints(
    postcodeTerm.length === 5 ? postcodeTerm : undefined,
    searchTerm.trim().length >= 3 ? searchTerm.trim() : undefined
  );

  const hasQuery = postcodeTerm.length === 5 || searchTerm.trim().length >= 3;
  const canSubmit = postcode.length === 5 || freeText.trim().length >= 3;

  function handleSubmit() {
    setPostcodeTerm(postcode);
    setSearchTerm(freeText);
  }

  // Q13.5 — pull approved-rating summaries for the visible points so each
  // card can show a star average + review count.
  const visibleIds = useMemo(() => (points ?? []).map((p) => p.id), [points]);
  const { data: ratings } = usePickupPointRatings(visibleIds);

  return (
    <GoogleMapsWrapper>
      <div className="bg-secondary-100 px-4 py-16 sm:px-6 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-3xl space-y-10">
            <div className="text-center">
              <Heading variant="page" as="h1">
                {t("title")}
              </Heading>
              <Text variant="body" className="text-text-muted mt-4">
                {t("subtitle")}
              </Text>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                type="text"
                placeholder={t("postcodePlaceholder")}
                maxLength={5}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="sm:max-w-40"
                aria-label={t("postcodeLabel")}
              />
              <Input
                type="text"
                placeholder={t("freeTextPlaceholder")}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                className="flex-1"
                aria-label={t("freeTextLabel")}
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className="bg-primary-500 hover:bg-primary-600 disabled:bg-primary-200 rounded-xl px-6 py-3 font-semibold text-white transition-colors"
              >
                {t("search")}
              </button>
            </form>

            {isFetching && (
              <div className="flex justify-center py-12">
                <span className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4" />
              </div>
            )}

            {!isFetching && points && points.length === 0 && hasQuery && (
              <NoResultsBlock query={searchTerm.trim() || postcodeTerm} />
            )}

            {!isFetching && !hasQuery && (
              <Text variant="body" className="text-text-muted py-6 text-center">
                {t("enterPostcode")}
              </Text>
            )}

            {points && points.length > 0 && (
              <div className="space-y-6">
                <PickupPointMap groups={[{ side: "origin", points }]} className="h-72" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {points.map((point) => (
                    <div
                      key={point.id}
                      className="border-border-default space-y-2 rounded-2xl border bg-white p-6"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{point.name}</p>
                          <p className="text-text-muted text-sm">
                            {point.address}
                            {point.city ? `, ${point.city}` : ""}
                          </p>
                          <p className="text-text-muted text-sm">{point.postcode}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                            point.is_open
                              ? "bg-success-100 text-success-700"
                              : "bg-error-100 text-error-700"
                          }`}
                        >
                          {point.is_open ? t("open") : t("closed")}
                        </span>
                      </div>
                      {point.phone && <p className="text-text-muted text-sm">{point.phone}</p>}
                      <RatingPill summary={ratings?.[point.id]} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <Link
                href="/book"
                className="bg-primary-500 hover:bg-primary-600 inline-block rounded-2xl px-8 py-4 text-lg font-semibold text-white transition-colors"
              >
                {t("cta")}
              </Link>
            </div>
          </div>
        </SectionContainer>
      </div>
    </GoogleMapsWrapper>
  );
}

// Q6.9 — when the query returns no matches, nudge the user toward either
// adjusting their query or signing up to be notified when Laveina expands.
// Hand-off to /contact keeps this UI-only; a dedicated `notify_signups`
// table can replace the mailto when coverage expansion is a live roadmap.
function NoResultsBlock({ query }: { query: string }) {
  const t = useTranslations("pickupPoints");
  return (
    <div className="border-border-muted mx-auto max-w-md rounded-2xl border bg-white/60 p-6 text-center">
      <p className="text-text-primary text-base font-semibold">{t("noResultsTitle")}</p>
      <p className="text-text-muted mt-1 text-sm">{t("noResultsBody", { query })}</p>
      <Link
        href="/contact"
        className="text-primary-700 hover:text-primary-800 mt-4 inline-flex items-center gap-1 text-sm font-semibold"
      >
        {t("notifyMeCta")}
      </Link>
    </div>
  );
}

// Q13.5 — compact star + count pill. Hides itself when there's no data so a
// brand-new pickup point with zero approved ratings doesn't render an
// awkward "0 reviews" badge.
function RatingPill({ summary }: { summary?: PickupPointRatingSummary }) {
  const t = useTranslations("pickupPoints");
  if (!summary || summary.count === 0) return null;
  return (
    <span className="bg-primary-50 text-primary-800 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
      <StarIcon className="h-3 w-3 fill-current" />
      {summary.average.toFixed(1)}
      <span className="text-text-muted font-normal">
        · {t("reviewCount", { count: summary.count })}
      </span>
    </span>
  );
}
