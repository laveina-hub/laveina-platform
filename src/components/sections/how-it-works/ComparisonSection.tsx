"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Heading, SectionContainer, Text } from "@/components/atoms";

const ROWS = [1, 2, 3, 4, 5, 6] as const;

export function ComparisonSection() {
  const t = useTranslations("howItWorks");

  return (
    <section className="bg-white py-20 md:py-28">
      <SectionContainer>
        <div className="mx-auto max-w-3xl">
          <Heading variant="page" as="h2" className="mb-12 text-center">
            {t("comparisonTitle")}
          </Heading>

          <div className="space-y-3">
            {ROWS.map((row) => (
              <div
                key={row}
                className="border-border-default grid grid-cols-1 overflow-hidden rounded-lg border sm:grid-cols-2"
              >
                <div className="flex items-start gap-3 bg-white px-5 py-4">
                  <X className="text-error/60 mt-0.5 h-4 w-4 shrink-0" />
                  <Text variant="body" className="text-text-secondary text-sm">
                    {t(`comparisonProblem${row}`)}
                  </Text>
                </div>
                <div className="bg-success/5 flex items-start gap-3 px-5 py-4">
                  <Check className="text-success mt-0.5 h-4 w-4 shrink-0" />
                  <Text variant="body" className="text-text-primary text-sm font-medium">
                    {t(`comparisonSolution${row}`)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
