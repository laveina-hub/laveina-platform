import { useTranslations } from "next-intl";

import { ButtonLink, Heading, SectionContainer, Text } from "@/components/atoms";
import { cn } from "@/lib/utils";

// Placeholder "from" prices — actual prices calculated at checkout
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
        "relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-all duration-300 sm:p-5 xl:p-7",
        highlighted
          ? "border-primary-400 shadow-elevated ring-primary-400/20 hover:shadow-overlay scale-[1.02] ring-1 hover:scale-[1.04]"
          : "shadow-card hover:shadow-elevated hover:border-primary-300/40 border-white/20 hover:-translate-y-1 hover:scale-[1.02]"
      )}
    >
      {highlighted && (
        <span className="bg-primary-500 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold tracking-wide text-white uppercase shadow-xs">
          {badge}
        </span>
      )}

      {!highlighted && (
        <span className="text-primary-200 font-body mb-2 text-xs font-semibold tracking-widest uppercase">
          {badge}
        </span>
      )}

      <h3 className="font-body text-text-primary text-lg font-bold sm:text-base xl:text-xl">
        {name}
      </h3>

      <div className="mt-5 flex items-baseline gap-1 sm:mt-4 xl:mt-6">
        <span className="text-text-muted text-sm">{fromLabel}</span>
        <span className="font-display text-text-primary text-5xl font-bold sm:text-3xl xl:text-5xl">
          &euro;{price}
        </span>
      </div>

      <Text variant="body" className="mt-2 text-sm xl:text-base">
        {description}
      </Text>

      <ButtonLink
        href="/book"
        variant={highlighted ? "primary" : "outline"}
        size="md"
        className="mt-auto w-full justify-center text-center"
      >
        {ctaLabel}
      </ButtonLink>
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
    <section className="bg-primary px-6 py-20 lg:py-28 xl:px-10">
      <SectionContainer className="px-0 md:px-0">
        <div className="mb-12 text-center md:mb-14 md:text-left">
          <Heading
            variant="section"
            className="text-text-inverse text-6xl font-medium lg:text-4xl xl:text-9xl"
          >
            {t("title")}
          </Heading>
          <Text variant="bodyLight" className="mx-auto mt-4 max-w-2xl md:mx-0">
            {t("description")}
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-5">
          {plans.map((plan) => (
            <PricingCard key={plan.badge} {...plan} />
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
