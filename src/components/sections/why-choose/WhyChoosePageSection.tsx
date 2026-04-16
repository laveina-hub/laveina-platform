import { Cpu, Leaf, Eye, ShieldCheck, Check, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ButtonLink, Heading, SectionContainer, Text } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  className?: string;
}

function FeatureCard({ icon, title, description, features, className }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "border-border-default rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md md:p-8",
        className
      )}
    >
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
            <Check className="text-success mt-0.5 h-4 w-4 shrink-0" />
            <Text variant="body" as="span" className="text-text-secondary text-sm font-medium">
              {feature}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TimelineStepProps {
  step: number;
  label: string;
  isLast: boolean;
  className?: string;
}

function TimelineStep({ step, label, isLast, className }: TimelineStepProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="flex flex-col items-center">
        <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
          {step}
        </div>
        {!isLast && <div className="bg-primary-200 my-1 h-8 w-0.5" />}
      </div>
      <Text variant="body" as="span" className="text-text-secondary pt-1 text-sm font-medium">
        {label}
      </Text>
    </div>
  );
}

export async function WhyChoosePageSection() {
  const t = await getTranslations("whyChoosePage");

  const trackingSteps = [
    t("transparencyStep1"),
    t("transparencyStep2"),
    t("transparencyStep3"),
    t("transparencyStep4"),
  ];

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

      <section className="px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <FeatureCard
              icon={<Cpu className="text-primary h-6 w-6" />}
              title={t("technologyTitle")}
              description={t("technologyDesc")}
              features={[t("technologyFeature1"), t("technologyFeature2"), t("technologyFeature3")]}
            />

            <FeatureCard
              icon={<Leaf className="text-success h-6 w-6" />}
              title={t("sustainabilityTitle")}
              description={t("sustainabilityDesc")}
              features={[
                t("sustainabilityFeature1"),
                t("sustainabilityFeature2"),
                t("sustainabilityFeature3"),
              ]}
            />

            <div className="border-border-default rounded-2xl border bg-white p-6 md:col-span-2 md:p-8">
              <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
                <div className="flex-1">
                  <div className="bg-primary-100 mb-5 flex h-12 w-12 items-center justify-center rounded-xl">
                    <Eye className="text-primary-500 h-6 w-6" />
                  </div>
                  <Heading variant="card" as="h3" className="mb-2">
                    {t("transparencyTitle")}
                  </Heading>
                  <Text variant="body">{t("transparencyDesc")}</Text>
                </div>

                <div className="shrink-0 md:pt-2">
                  {trackingSteps.map((label, i) => (
                    <TimelineStep
                      key={i}
                      step={i + 1}
                      label={label}
                      isLast={i === trackingSteps.length - 1}
                    />
                  ))}
                </div>
              </div>
            </div>

            <FeatureCard
              icon={<ShieldCheck className="text-primary h-6 w-6" />}
              title={t("securityTitle")}
              description={t("securityDesc")}
              features={[t("securityFeature1"), t("securityFeature2"), t("securityFeature3")]}
            />

            <div className="bg-primary flex flex-col items-center justify-center rounded-2xl p-6 text-center md:p-8">
              <Package className="mb-4 h-10 w-10 text-white/80" />
              <Heading variant="card" as="h3" className="mb-2 text-white">
                {t("promiseTitle")}
              </Heading>
              <Text variant="body" className="max-w-xs text-white/80">
                {t("promiseText")}
              </Text>
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
            <Text variant="body" className="mt-2 mb-6">
              {t("ctaSubtitle")}
            </Text>
            <ButtonLink href="/book" variant="primary" size="xl">
              {t("ctaButton")}
            </ButtonLink>
          </div>
        </SectionContainer>
      </section>
    </div>
  );
}
