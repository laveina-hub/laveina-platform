import { useTranslations } from "next-intl";

import { ButtonLink, Heading, SectionContainer, Text } from "@/components/atoms";
import { cn } from "@/lib/utils";

const PLAN_PRICES: Record<string, number> = {
  fastest: 12,
  popular: 8,
  value: 6,
  economy: 4,
  bulk: 3,
};

interface PricingCardProps {
  badge: string;
  name: string;
  price: number;
  description: string;
  highlighted: boolean;
  ctaLabel: string;
  fromLabel: string;
}

function PricingCard({
  badge,
  name,
  price,
  description,
  highlighted,
  ctaLabel,
  fromLabel,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl",
        highlighted && "ring-primary-400 ring-2"
      )}
    >
      <div
        className={cn(
          "px-4 py-8 text-center sm:py-4 xl:py-8",
          highlighted ? "bg-primary" : "bg-secondary-300"
        )}
      >
        <span
          className={cn(
            "font-body text-2xl font-semibold tracking-widest uppercase sm:text-base xl:text-3xl",
            highlighted ? "text-text-inverse" : "text-primary"
          )}
        >
          {badge}
        </span>
      </div>

      <div className="xm:pb-3 flex flex-1 flex-col bg-white px-6 pb-4 sm:pt-10 xl:pt-24 xl:pb-5">
        <h3
          className={cn(
            "font-display text-text-primary text-center text-4xl font-bold sm:text-base xl:text-4xl"
          )}
        >
          {name}
        </h3>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:mt-8 xl:mt-11">
          <Text variant="detail" as="span" className="text-base sm:text-xs xl:text-base">
            {fromLabel}
          </Text>
          <div className="flex items-start leading-none">
            <span className="font-body text-secondary-500 mt-1 text-2xl font-bold md:text-base xl:text-2xl">
              $
            </span>
            <span className="font-display text-secondary-500 xl:text-10xl text-10xl font-bold sm:text-4xl">
              {price}
            </span>
          </div>
          <Text variant="detail" as="span" className="text-base md:text-xs xl:text-base">
            {description}
          </Text>
        </div>

        <ButtonLink
          href="/book"
          variant="secondary"
          size="pricing"
          className="mt-auto block text-center"
        >
          {ctaLabel}
        </ButtonLink>
      </div>
    </div>
  );
}

export function PricingSection() {
  const t = useTranslations("home.pricingSection");

  const plans: PricingCardProps[] = [
    {
      badge: t("fastestBadge"),
      name: t("fastestName"),
      price: PLAN_PRICES.fastest,
      description: t("fastestDesc"),
      highlighted: false,
      ctaLabel: t("requestDelivery"),
      fromLabel: t("from"),
    },
    {
      badge: t("popularBadge"),
      name: t("popularName"),
      price: PLAN_PRICES.popular,
      description: t("popularDesc"),
      highlighted: true,
      ctaLabel: t("requestDelivery"),
      fromLabel: t("from"),
    },
    {
      badge: t("valueBadge"),
      name: t("valueName"),
      price: PLAN_PRICES.value,
      description: t("valueDesc"),
      highlighted: false,
      ctaLabel: t("requestDelivery"),
      fromLabel: t("from"),
    },
    {
      badge: t("economyBadge"),
      name: t("economyName"),
      price: PLAN_PRICES.economy,
      description: t("economyDesc"),
      highlighted: false,
      ctaLabel: t("requestDelivery"),
      fromLabel: t("from"),
    },
    {
      badge: t("bulkBadge"),
      name: t("bulkName"),
      price: PLAN_PRICES.bulk,
      description: t("bulkDesc"),
      highlighted: false,
      ctaLabel: t("requestDelivery"),
      fromLabel: t("from"),
    },
  ];

  return (
    <section className="bg-primary px-6 py-20 lg:py-32 xl:px-10">
      <SectionContainer className="px-0 md:px-0">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3 xl:gap-x-14 xl:gap-y-10">
          <div className="flex flex-col justify-center gap-6">
            <Heading variant="display">{t("title")}</Heading>
            <Text variant="bodyLight">{t("description")}</Text>
          </div>

          {plans.map((plan) => (
            <PricingCard key={plan.badge} {...plan} />
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
