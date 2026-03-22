import Image from "next/image";
import { useTranslations } from "next-intl";

import { Button, Heading, SectionContainer, Text } from "@/components/atoms";
import { PinIcon } from "@/components/icons";

export function PickupPointsNetworkSection() {
  const t = useTranslations("pickupPointsNetwork");

  const pickupPoints = [
    {
      name: t("point1Name"),
      status: t("point1Status"),
      distance: t("point1Distance"),
      active: true,
    },
    {
      name: t("point2Name"),
      status: t("point2Status"),
      distance: t("point2Distance"),
      active: false,
    },
    {
      name: t("point3Name"),
      status: t("point3Status"),
      distance: t("point3Distance"),
      active: false,
    },
  ];

  return (
    <section className="bg-white py-12 xl:py-20">
      <SectionContainer>
        <div className="mb-10 text-center md:mb-12">
          <Heading variant="section">{t("title")}</Heading>
          <Text variant="subtitle" className="text-text-secondary mx-auto mt-4 max-w-3xl">
            {t("subtitle")}
          </Text>
        </div>

        <div className="flex flex-col gap-14 md:flex-row md:items-center md:gap-8">
          <div className="flex w-full flex-col gap-4 md:w-1/2">
            {pickupPoints.map((point) =>
              point.active ? (
                <ActivePickupCard
                  key={point.name}
                  name={point.name}
                  status={point.status}
                  distance={point.distance}
                  buttonLabel={t("getDirections")}
                />
              ) : (
                <PickupCard
                  key={point.name}
                  name={point.name}
                  status={point.status}
                  distance={point.distance}
                  buttonLabel={t("getDirections")}
                />
              )
            )}
          </div>

          <div className="w-full md:w-1/2">
            <div className="border-border-default overflow-hidden rounded-xl border">
              <Image
                src="/images/pickup-points/pickup-points-coverage-map.png"
                alt={t("mapAlt")}
                width={640}
                height={480}
                className="h-64 w-full object-cover sm:h-80 md:h-full md:min-h-72"
              />
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}

interface PickupCardProps {
  name: string;
  status: string;
  distance: string;
  buttonLabel: string;
}

function PickupCard({ name, status, distance, buttonLabel }: PickupCardProps) {
  return (
    <div className="border-border-default flex flex-col items-start justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center 2xl:p-10">
      <div className="min-w-0 flex-1">
        <p className="font-body text-text-primary text-base font-semibold 2xl:text-2xl">{name}</p>
        <div className="mt-1 flex items-center gap-2">
          <Text variant="detail" as="span">
            {status}
          </Text>
          <span aria-hidden="true" className="text-text-muted">
            ·
          </span>
          <PinIcon />
          <Text variant="detail" as="span">
            {distance}
          </Text>
        </div>
      </div>

      <Button variant="outline" size="sm" className="text-xs 2xl:text-lg">
        {buttonLabel}
      </Button>
    </div>
  );
}

function ActivePickupCard({ name, status, distance, buttonLabel }: PickupCardProps) {
  return (
    <div className="bg-primary-500 flex flex-col items-start justify-between gap-4 rounded-xl p-5 shadow-md sm:flex-row sm:items-center 2xl:p-10">
      <div className="min-w-0 flex-1">
        <p className="font-body text-base font-semibold text-white 2xl:text-2xl">{name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-body text-primary-100 text-xs 2xl:text-lg">{status}</span>
          <span aria-hidden="true" className="text-primary-200">
            ·
          </span>
          <PinIcon className="text-primary-100" />
          <span className="font-body text-primary-100 text-xs 2xl:text-lg">{distance}</span>
        </div>
      </div>

      <button
        type="button"
        className="font-body hover:bg-primary-600 focus-visible:ring-offset-primary-500 shrink-0 rounded-md border border-white px-4 py-2 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:outline-none 2xl:text-lg"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
