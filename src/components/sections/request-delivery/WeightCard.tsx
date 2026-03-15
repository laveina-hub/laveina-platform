"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CardShell } from "@/components/atoms";
import { RangeSlider } from "@/components/molecules";

const MIN_WEIGHT = 0.5;
const MAX_WEIGHT = 30;
const STEP = 0.5;

interface WeightCardProps {
  className?: string;
}

export function WeightCard({ className }: WeightCardProps) {
  const t = useTranslations("requestDelivery");
  const [weight, setWeight] = useState(2);

  return (
    <CardShell className={className}>
      <div className="flex flex-col gap-4 px-7 py-9 lg:flex-row lg:items-center lg:gap-4 lg:p-9">
        <div className="flex shrink-0 gap-10">
          <h2 className="font-body text-text-muted text-2xl font-medium sm:text-4xl">
            {t("weight")}
          </h2>
          <Image
            src="/images/request-delivery/box-package.svg"
            alt={t("packageBoxAlt")}
            width={72}
            height={84}
            className="h-auto w-14 object-contain sm:w-20"
          />
        </div>

        <RangeSlider
          value={weight}
          onChange={setWeight}
          min={MIN_WEIGHT}
          max={MAX_WEIGHT}
          step={STEP}
          unit="kg"
          ariaLabel={t("packageWeight")}
          decreaseLabel={t("decreaseWeight")}
          increaseLabel={t("increaseWeight")}
        />
      </div>
    </CardShell>
  );
}
