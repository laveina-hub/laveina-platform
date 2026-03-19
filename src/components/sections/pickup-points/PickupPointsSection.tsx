"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Heading, Input, SectionContainer, Text } from "@/components/atoms";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { Link } from "@/i18n/navigation";

export function PickupPointsSection() {
  const t = useTranslations("pickupPoints");
  const [postcode, setPostcode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: points, isFetching } = usePickupPoints(
    searchTerm.length === 5 ? searchTerm : undefined
  );

  return (
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

          {/* Postcode search */}
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder={t("postcodePlaceholder")}
              maxLength={5}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="max-w-40"
            />
            <button
              type="button"
              onClick={() => setSearchTerm(postcode)}
              disabled={postcode.length !== 5}
              className="bg-primary-500 hover:bg-primary-600 disabled:bg-primary-200 rounded-xl px-6 py-3 font-semibold text-white transition-colors"
            >
              {t("search")}
            </button>
          </div>

          {/* Results */}
          {isFetching && (
            <div className="flex justify-center py-12">
              <span className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4" />
            </div>
          )}

          {!isFetching && points && points.length === 0 && searchTerm && (
            <Text variant="body" className="text-text-muted py-12 text-center">
              {t("noResults")}
            </Text>
          )}

          {!isFetching && !searchTerm && (
            <Text variant="body" className="text-text-muted py-6 text-center">
              {t("enterPostcode")}
            </Text>
          )}

          {points && points.length > 0 && (
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
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
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
  );
}
