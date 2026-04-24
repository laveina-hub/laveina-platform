import { Leaf, Award, BarChart3, TrendingUp, BadgeCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Heading, SectionContainer, Text } from "@/components/atoms";
import {
  CheckIcon,
  ChevronIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MessageIcon,
  PackageIcon,
  PhoneIcon,
  ZapIcon,
} from "@/components/icons";
import { Link } from "@/i18n/navigation";

function FeatureCard({
  icon,
  title,
  description,
  features,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="border-border-default group rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md md:p-8">
      <div className="bg-primary-100 mb-5 flex h-12 w-12 items-center justify-center rounded-xl">
        {icon}
      </div>

      <Heading variant="card" as="h3" className="mb-2">
        {title}
      </Heading>

      <Text variant="body" className="mb-5">
        {description}
      </Text>

      <ul className="space-y-2.5">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <CheckIcon className="text-success mt-0.5 h-4 w-4 shrink-0" />
            <span className="text-text-secondary text-sm font-medium">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function EcoPartnerPageSection() {
  const t = await getTranslations("ecoPartnerPage");

  return (
    <div className="bg-secondary-100">
      <section className="border-border-default border-b px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-2xl text-center">
            <Heading variant="page" as="h1">
              {t("heroTitle")}
            </Heading>
            <div className="bg-tertiary-50 mx-auto mt-4 h-1 w-16 rounded-full" />
            <Text variant="subtitle" className="text-text-light mt-6">
              {t("heroSubtitle")}
            </Text>
          </div>
        </SectionContainer>
      </section>

      <section className="px-4 pt-16 sm:px-6 md:pt-24 lg:px-10">
        <SectionContainer>
          <div className="bg-primary mx-auto max-w-5xl rounded-2xl px-6 py-8 text-center md:px-10 md:py-10">
            <Leaf className="mx-auto mb-3 h-8 w-8 text-white/80" />
            <Heading variant="card" as="h2" className="mb-2 text-white">
              {t("freeTitle")}
            </Heading>
            <Text variant="body" className="mx-auto max-w-xl text-white/80">
              {t("freeP2")}
            </Text>
          </div>
        </SectionContainer>
      </section>

      <section className="px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <FeatureCard
              icon={<ZapIcon className="text-primary h-6 w-6" />}
              title={t("electricTitle")}
              description={t("electricP1")}
              features={[
                t("electricBenefit1"),
                t("electricBenefit2"),
                t("electricBenefit3"),
                t("electricBenefit4"),
              ]}
            />

            <FeatureCard
              icon={<TrendingUp className="text-primary h-6 w-6" />}
              title={t("integrationTitle")}
              description={t("integrationP1")}
              features={[t("integrationResult"), t("integrationP3")]}
            />

            <FeatureCard
              icon={<PackageIcon className="text-success h-6 w-6" />}
              title={t("packagingTitle")}
              description={t("packagingP1")}
              features={[t("packagingResult"), t("packagingP3")]}
            />

            <FeatureCard
              icon={<BarChart3 className="text-primary h-6 w-6" />}
              title={t("monitorTitle")}
              description={t("monitorP2")}
              features={[
                t("monitorItem1"),
                t("monitorItem2"),
                t("monitorItem3"),
                t("monitorItem4"),
              ]}
            />
          </div>
        </SectionContainer>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <div className="bg-primary-100 mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl">
                <Award className="text-primary-500 h-6 w-6" />
              </div>
              <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
                {t("certTitle")}
              </Heading>
              <Text variant="body" className="mx-auto mt-3 max-w-2xl">
                {t("certP1")}
              </Text>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="border-border-default rounded-2xl border p-6 md:p-8">
                <BadgeCheck className="text-primary mb-4 h-8 w-8" />
                <Heading variant="card" as="h3" className="mb-2">
                  {t("certPhysicalTitle")}
                </Heading>
                <Text variant="body" className="mb-4">
                  {t("certPhysicalP2")}
                </Text>
                <div className="bg-primary-50 border-primary-200 rounded-lg border px-4 py-3">
                  <p className="text-primary-700 text-center text-sm font-medium italic">
                    {t("certPhysicalQuote")}
                  </p>
                </div>
              </div>

              <div className="border-border-default rounded-2xl border p-6 md:p-8">
                <GlobeIcon className="text-primary mb-4 h-8 w-8" />
                <Heading variant="card" as="h3" className="mb-2">
                  {t("certDigitalTitle")}
                </Heading>
                <Text variant="body" className="mb-4">
                  {t("certDigitalP2")}
                </Text>
                <ul className="space-y-2">
                  {[
                    t("certDigitalItem1"),
                    t("certDigitalItem2"),
                    t("certDigitalItem3"),
                    t("certDigitalItem4"),
                    t("certDigitalItem5"),
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <CheckIcon className="text-success h-4 w-4 shrink-0" />
                      <span className="text-text-secondary text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="bg-primary flex flex-col justify-center rounded-2xl p-8 md:p-10">
              <TrendingUp className="mb-4 h-10 w-10 text-white/80" />
              <Heading variant="card" as="h3" className="mb-3 text-white">
                {t("brandTitle")}
              </Heading>
              <Text variant="body" className="text-white/80">
                {t("brandHighlight")}
              </Text>
            </div>

            <div className="border-border-default rounded-2xl border bg-white p-6 md:p-8">
              <Heading variant="card" as="h3" className="mb-5">
                {t("whyTitle")}
              </Heading>
              <ul className="space-y-2.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckIcon className="text-success mt-0.5 h-4 w-4 shrink-0" />
                    <span className="text-text-secondary text-sm font-medium">
                      {t(`benefit${i + 1}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="border-border-default border-t px-4 py-16 sm:px-6 md:py-20 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-xl text-center">
            <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
              {t("ctaTitle")}
            </Heading>
            <Text variant="body" className="mt-2 mb-6 italic">
              {t("ctaSubtitle")}
            </Text>
            <Link
              href="/book"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white transition-colors"
            >
              {t("ctaButton")}
              <ChevronIcon direction="right" className="h-4 w-4" />
            </Link>

            <div className="mt-10 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
              <div className="flex items-center gap-2.5">
                <PhoneIcon className="text-primary h-4 w-4 shrink-0" />
                <span className="text-text-secondary text-sm">{t("contactPhone")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MessageIcon className="text-success h-4 w-4 shrink-0" />
                <span className="text-text-secondary text-sm">{t("contactWhatsApp")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MailIcon className="text-primary h-4 w-4 shrink-0" />
                <span className="text-text-secondary text-sm">{t("contactEmail")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPinIcon className="text-primary h-4 w-4 shrink-0" />
                <span className="text-text-secondary text-sm">{t("contactAddress")}</span>
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>
    </div>
  );
}
