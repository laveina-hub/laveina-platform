"use client";

import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Heading, SectionContainer, Text } from "@/components/atoms";

const STEPS = [1, 2, 3, 4, 5] as const;

export function BusinessSection() {
  const t = useTranslations("howItWorks");

  return (
    <section className="bg-primary-50/40 py-20 md:py-28">
      <SectionContainer>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Heading variant="page" as="h2">
              {t("businessTitle")}
            </Heading>
            <div className="bg-secondary-500 mt-3 h-1 w-20" />
          </div>

          <Text variant="subtitle" as="p" className="text-secondary-500 mb-4 font-semibold">
            {t("businessSubtitle")}
          </Text>

          <Text variant="body" className="mb-12 text-base leading-relaxed xl:text-lg">
            {t("businessDescription")}
          </Text>

          <div className="space-y-6">
            {STEPS.map((step) => (
              <div key={step} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="bg-secondary-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                    {step}
                  </div>
                  {step < 5 && <div className="bg-secondary-500/20 mt-2 w-px flex-1" />}
                </div>
                <div className="pb-6">
                  <Text variant="body" as="h4" className="text-text-primary mb-1 font-semibold">
                    {t(`businessStep${step}Title`)}
                  </Text>
                  <Text variant="body" className="text-sm leading-relaxed">
                    {t(`businessStep${step}Desc`)}
                  </Text>
                </div>
              </div>
            ))}
          </div>

          <div className="border-secondary-500 bg-secondary-500/5 mt-10 rounded-lg border-l-4 py-4 pr-4 pl-5">
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle className="text-secondary-500 h-4 w-4 shrink-0" />
              <Text variant="body" as="span" className="text-text-primary font-semibold">
                {t("businessSignatureTitle")}
              </Text>
            </div>
            <Text variant="body" className="text-sm leading-relaxed italic">
              {t("businessSignatureDesc")}
            </Text>
          </div>

          <div className="border-border-default mt-6 rounded-lg border bg-white p-5">
            <Text variant="body" as="h4" className="text-text-primary mb-3 font-semibold">
              {t("businessCoverageTitle")}
            </Text>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5">
                <span className="bg-secondary-500 mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                <Text variant="body" as="span" className="text-sm">
                  {t("businessCoverage1")}
                </Text>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="bg-secondary-500 mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                <Text variant="body" as="span" className="text-sm">
                  {t("businessCoverage2")}
                </Text>
              </li>
            </ul>
          </div>

          {/* Journey summary */}
          <div className="bg-secondary-500/5 mt-6 rounded-lg px-5 py-3">
            <Text variant="caption" className="text-text-muted mb-0.5 tracking-wider uppercase">
              {t("journeyLabel")}
            </Text>
            <Text variant="body" className="text-secondary-500 text-sm font-semibold">
              {t("businessJourney")}
            </Text>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
