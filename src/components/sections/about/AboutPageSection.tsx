import { Heart, Leaf, MousePointerClick, Eye, MapPin, Building2, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Heading, SectionContainer, Text } from "@/components/atoms";
import { Link } from "@/i18n/navigation";

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border-default group relative overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:shadow-lg md:p-8">
      <div className="bg-primary-50 absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="bg-primary-100 mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
          {icon}
        </div>
        <Heading variant="card" as="h3" className="mb-2">
          {title}
        </Heading>
        <Text variant="body" className="text-text-light">
          {description}
        </Text>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white/60 px-6 py-8 backdrop-blur-sm">
      <span className="text-primary text-4xl font-bold tracking-tight md:text-5xl">{value}</span>
      <span className="text-text-light mt-2 text-sm font-medium">{label}</span>
    </div>
  );
}

export async function AboutPageSection() {
  const t = await getTranslations("aboutPage");

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

      <section className="border-border-default border-b px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <div className="bg-primary-100 mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                <MapPin className="text-primary h-6 w-6" />
              </div>
              <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
                {t("missionTitle")}
              </Heading>
              <Text variant="subtitle" className="text-text-light mt-4">
                {t("missionText")}
              </Text>
            </div>
            <div className="bg-primary relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <Building2 className="h-24 w-24 text-white/20" />
              <div className="absolute right-6 bottom-6 left-6">
                <div className="rounded-xl bg-white/10 px-5 py-4 backdrop-blur-md">
                  <span className="text-sm font-semibold text-white">{t("missionTitle")}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="border-border-default border-b px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
                {t("storyTitle")}
              </Heading>
              <div className="bg-tertiary-50 mx-auto mt-4 h-1 w-16 rounded-full" />
            </div>
            <div className="space-y-6">
              <div className="border-border-default rounded-2xl border bg-white p-6 md:p-8">
                <div className="border-primary-200 flex gap-5 border-l-2 pl-5">
                  <Text variant="body" className="text-text-light">
                    {t("storyText1")}
                  </Text>
                </div>
              </div>
              <div className="border-border-default rounded-2xl border bg-white p-6 md:p-8">
                <div className="border-primary-200 flex gap-5 border-l-2 pl-5">
                  <Text variant="body" className="text-text-light">
                    {t("storyText2")}
                  </Text>
                </div>
              </div>
              <div className="border-border-default rounded-2xl border bg-white p-6 md:p-8">
                <div className="border-primary-200 flex gap-5 border-l-2 pl-5">
                  <Text variant="body" className="text-text-light">
                    {t("storyText3")}
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="border-border-default border-b px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mb-12 text-center">
            <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
              {t("valuesTitle")}
            </Heading>
            <div className="bg-tertiary-50 mx-auto mt-4 h-1 w-16 rounded-full" />
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
            <ValueCard
              icon={<Heart className="text-primary h-6 w-6" />}
              title={t("valueReliabilityTitle")}
              description={t("valueReliabilityDesc")}
            />
            <ValueCard
              icon={<Leaf className="text-success h-6 w-6" />}
              title={t("valueSustainabilityTitle")}
              description={t("valueSustainabilityDesc")}
            />
            <ValueCard
              icon={<MousePointerClick className="text-primary h-6 w-6" />}
              title={t("valueSimplicityTitle")}
              description={t("valueSimplicityDesc")}
            />
            <ValueCard
              icon={<Eye className="text-primary h-6 w-6" />}
              title={t("valueTransparencyTitle")}
              description={t("valueTransparencyDesc")}
            />
          </div>
        </SectionContainer>
      </section>

      <section className="bg-primary-50/50 border-border-default border-b px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mb-12 text-center">
            <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
              {t("networkTitle")}
            </Heading>
            <Text variant="body" className="text-text-light mt-3">
              {t("networkSubtitle")}
            </Text>
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard value={t("statPickupPointsValue")} label={t("statPickupPoints")} />
            <StatCard value={t("statCitiesValue")} label={t("statCities")} />
            <StatCard value={t("statDeliveryRateValue")} label={t("statDeliveryRate")} />
          </div>
        </SectionContainer>
      </section>

      <section className="px-4 py-16 sm:px-6 md:py-20 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-xl text-center">
            <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
              {t("ctaTitle")}
            </Heading>
            <Text variant="body" className="mt-2 mb-8">
              {t("ctaSubtitle")}
            </Text>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/book"
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white transition-colors"
              >
                {t("ctaButton")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="border-border-default hover:bg-primary-50 inline-flex items-center gap-2 rounded-xl border bg-white px-8 py-4 text-base font-semibold transition-colors"
              >
                {t("ctaPartnerButton")}
              </Link>
            </div>
          </div>
        </SectionContainer>
      </section>
    </div>
  );
}
