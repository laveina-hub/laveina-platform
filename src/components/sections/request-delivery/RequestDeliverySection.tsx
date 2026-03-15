"use client";

import { useTranslations } from "next-intl";

import { Heading, SectionContainer } from "@/components/atoms";

import { DeliverToCard } from "./DeliverToCard";
import { DeliverySpeedCard } from "./DeliverySpeedCard";
import { PickupFromCard } from "./PickupFromCard";
import { PricingSummaryCard } from "./PricingSummaryCard";
import { ShipmentDetailsCard } from "./ShipmentDetailsCard";
import { WeightCard } from "./WeightCard";

export function RequestDeliverySection() {
  const t = useTranslations("requestDelivery");

  return (
    <div className="bg-secondary-100 px-4 pt-14 pb-24 sm:px-6 sm:py-18 sm:pb-30 lg:px-10 lg:py-24">
      <SectionContainer>
        <Heading variant="page" as="h1" className="mb-8 sm:mb-16">
          {t("title")}
        </Heading>

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ShipmentDetailsCard />
            <WeightCard />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <PickupFromCard />
              <DeliverToCard />
            </div>

            <div className="xl:hidden">
              <PricingSummaryCard />
            </div>

            <DeliverySpeedCard />
          </div>

          <div className="hidden w-full max-w-96 shrink-0 xl:block">
            <PricingSummaryCard className="sticky top-24" />
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}
