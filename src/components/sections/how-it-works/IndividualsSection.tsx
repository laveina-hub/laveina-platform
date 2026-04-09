"use client";

import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Heading, SectionContainer, Text } from "@/components/atoms";

const STEPS = [1, 2, 3, 4, 5] as const;

export function IndividualsSection() {
  const t = useTranslations("howItWorks");

  return (
    <section className="bg-white py-20 md:py-28">
      <SectionContainer>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Heading variant="page" as="h2">
              {t("individualsTitle")}
            </Heading>
            <div className="bg-tertiary-50 mt-3 h-1 w-20" />
          </div>

          <Text variant="subtitle" as="p" className="text-tertiary-50 mb-4 font-semibold">
            {t("individualsSubtitle")}
          </Text>

          <Text variant="body" className="text-base leading-relaxed xl:text-lg">
            {t("individualsDescription")}
          </Text>

          <p className="border-tertiary-50/20 text-text-secondary mt-4 mb-12 border-l-4 pl-4 text-sm leading-relaxed italic">
            {t("individualsExample")}
          </p>

          <div className="space-y-6">
            {STEPS.map((step) => (
              <div key={step} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="bg-tertiary-50 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                    {step}
                  </div>
                  {step < 5 && <div className="bg-tertiary-50/20 mt-2 w-px flex-1" />}
                </div>
                <div className="pb-6">
                  <Text variant="body" as="h4" className="text-text-primary mb-1 font-semibold">
                    {t(`individualsStep${step}Title`)}
                  </Text>
                  <Text variant="body" className="text-sm leading-relaxed">
                    {t(`individualsStep${step}Desc`)}
                  </Text>
                </div>
              </div>
            ))}
          </div>

          {/* OTP highlight */}
          <div className="border-success bg-success/5 mt-10 rounded-lg border-l-4 py-4 pr-4 pl-5">
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle className="text-success h-4 w-4 shrink-0" />
              <Text variant="body" as="span" className="text-text-primary font-semibold">
                {t("individualsOtpTitle")}
              </Text>
            </div>
            <Text variant="body" className="text-sm leading-relaxed">
              {t("individualsOtpDesc")}
            </Text>
          </div>

          {/* Journey summary */}
          <div className="bg-tertiary-50/10 mt-6 rounded-lg px-5 py-3">
            <Text variant="caption" className="text-text-muted mb-0.5 tracking-wider uppercase">
              {t("journeyLabel")}
            </Text>
            <Text variant="body" className="text-tertiary-50 text-sm font-semibold">
              {t("individualsJourney")}
            </Text>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
