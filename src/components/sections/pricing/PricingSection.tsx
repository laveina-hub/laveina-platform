import { getTranslations } from "next-intl/server";

import { Heading, SectionContainer, Text } from "@/components/atoms";
import { Link } from "@/i18n/navigation";

/**
 * Public pricing page.
 * Explains the dual pricing model (internal Barcelona + SendCloud Spain-wide).
 * Exact prices depend on admin_settings — displayed as a general guide here.
 */
export async function PricingSection() {
  const t = await getTranslations("pricing");

  return (
    <div className="bg-secondary-100 px-4 py-16 sm:px-6 lg:px-10">
      <SectionContainer>
        <div className="mx-auto max-w-3xl space-y-12">
          <div className="text-center">
            <Heading variant="page" as="h1">
              {t("title")}
            </Heading>
            <Text variant="body" className="text-text-muted mx-auto mt-4 max-w-2xl">
              {t("subtitle")}
            </Text>
          </div>

          {/* Dual model explanation */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Barcelona internal */}
            <div className="border-border-default space-y-3 rounded-2xl border bg-white p-8">
              <div className="flex items-center gap-3">
                <span className="bg-primary-100 text-primary-700 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  {t("barcelonaLabel")}
                </span>
              </div>
              <Heading variant="card" as="h2">
                {t("barcelonaTitle")}
              </Heading>
              <Text variant="body" className="text-text-muted">
                {t("barcelonaDesc")}
              </Text>
              <ul className="text-text-muted list-inside list-disc space-y-1 text-sm">
                <li>{t("barcelonaFeature1")}</li>
                <li>{t("barcelonaFeature2")}</li>
                <li>{t("barcelonaFeature3")}</li>
              </ul>
            </div>

            {/* Spain-wide SendCloud */}
            <div className="border-border-default space-y-3 rounded-2xl border bg-white p-8">
              <div className="flex items-center gap-3">
                <span className="bg-tertiary-100 text-tertiary-700 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  {t("spainLabel")}
                </span>
              </div>
              <Heading variant="card" as="h2">
                {t("spainTitle")}
              </Heading>
              <Text variant="body" className="text-text-muted">
                {t("spainDesc")}
              </Text>
              <ul className="text-text-muted list-inside list-disc space-y-1 text-sm">
                <li>{t("spainFeature1")}</li>
                <li>{t("spainFeature2")}</li>
                <li>{t("spainFeature3")}</li>
              </ul>
            </div>
          </div>

          {/* IVA + insurance note */}
          <div className="border-border-default space-y-3 rounded-2xl border bg-white p-8 text-center">
            <Heading variant="card" as="h2">
              {t("additionalTitle")}
            </Heading>
            <Text variant="body" className="text-text-muted">
              {t("ivaNote")}
            </Text>
            <Text variant="body" className="text-text-muted">
              {t("insuranceNote")}
            </Text>
          </div>

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
