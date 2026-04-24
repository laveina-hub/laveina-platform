import { Bell, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ButtonLink, Heading, SectionContainer, Text } from "@/components/atoms";
import {
  CheckIcon,
  ChevronIcon,
  MailIcon,
  MapPinIcon,
  PackageIcon,
  TrackingTruckIcon,
} from "@/components/icons";

type JourneyStepProps = {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function JourneyStep({ step, icon, title, description }: JourneyStepProps) {
  return (
    <div className="border-border-default group relative rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md md:p-7">
      <span
        aria-hidden
        className="bg-primary-50 text-primary-600 absolute top-5 right-5 rounded-full px-2 py-0.5 text-xs font-bold tracking-wider"
      >
        {String(step).padStart(2, "0")}
      </span>

      <div className="bg-primary-100 mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
        {icon}
      </div>

      <Heading variant="card" as="h3" className="mb-2">
        {title}
      </Heading>

      <Text variant="body" className="text-text-light text-sm leading-relaxed">
        {description}
      </Text>
    </div>
  );
}

type WhereRowProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function WhereRow({ icon, title, description }: WhereRowProps) {
  return (
    <li className="flex items-start gap-4">
      <div className="bg-primary-50 text-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-text-primary text-sm font-semibold">{title}</p>
        <p className="text-text-light mt-0.5 text-sm">{description}</p>
      </div>
    </li>
  );
}

export async function TrackingInfoSection() {
  const t = await getTranslations("tracking");
  const tBucket = await getTranslations("trackingBucket");

  const journeySteps: Array<Omit<JourneyStepProps, "step">> = [
    {
      icon: <PackageIcon className="text-primary-500 h-6 w-6" />,
      title: tBucket("awaiting_dropoff"),
      description: t("journeyAwaitingDesc"),
    },
    {
      icon: <CheckIcon className="text-primary-500 h-6 w-6" />,
      title: tBucket("collected_at_origin"),
      description: t("journeyCollectedDesc"),
    },
    {
      icon: <TrackingTruckIcon size={24} className="text-primary-500" />,
      title: tBucket("in_transit"),
      description: t("journeyInTransitDesc"),
    },
    {
      icon: <MapPinIcon className="text-primary-500 h-6 w-6" />,
      title: tBucket("at_destination"),
      description: t("journeyAtDestinationDesc"),
    },
  ];

  return (
    <>
      <section className="border-border-default border-t px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
              {t("journeyTitle")}
            </Heading>
            <div className="bg-tertiary-50 mx-auto mt-4 h-1 w-16 rounded-full" />
            <Text variant="body" className="text-text-light mt-4">
              {t("journeySubtitle")}
            </Text>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {journeySteps.map((step, i) => (
              <JourneyStep
                key={step.title}
                step={i + 1}
                icon={step.icon}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </SectionContainer>
      </section>

      <section className="border-border-default border-t px-4 py-16 sm:px-6 md:py-24 lg:px-10">
        <SectionContainer>
          <div className="border-border-default mx-auto max-w-3xl rounded-2xl border bg-white p-6 md:p-10">
            <div className="mb-6 md:mb-8">
              <Heading variant="card" as="h2" className="text-xl md:text-2xl">
                {t("whereTitle")}
              </Heading>
              <Text variant="body" className="text-text-light mt-2 text-sm md:text-base">
                {t("whereSubtitle")}
              </Text>
            </div>
            <ul className="flex flex-col gap-5">
              <WhereRow
                icon={<MailIcon className="h-5 w-5" />}
                title={t("whereEmailTitle")}
                description={t("whereEmailDesc")}
              />
              <WhereRow
                icon={<Smartphone className="h-5 w-5" />}
                title={t("whereSmsTitle")}
                description={t("whereSmsDesc")}
              />
              <WhereRow
                icon={<Bell className="h-5 w-5" />}
                title={t("whereAccountTitle")}
                description={t("whereAccountDesc")}
              />
            </ul>
          </div>
        </SectionContainer>
      </section>

      <section className="border-border-default border-t px-4 py-16 sm:px-6 md:py-20 lg:px-10">
        <SectionContainer>
          <div className="mx-auto max-w-xl text-center">
            <Heading variant="card" as="h2" className="text-2xl md:text-3xl">
              {t("helpTitle")}
            </Heading>
            <Text variant="body" className="text-text-light mx-auto mt-3 mb-8">
              {t("helpSubtitle")}
            </Text>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/book" variant="primary" size="lg">
                {t("sendParcelCta")}
                <ChevronIcon direction="right" className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline" size="lg">
                {t("contactSupport")}
              </ButtonLink>
            </div>
          </div>
        </SectionContainer>
      </section>
    </>
  );
}
