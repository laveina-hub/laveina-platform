"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Heading, Text, SectionContainer } from "@/components/atoms";
import { BookingStepper } from "@/components/molecules";
import { GoogleMapsWrapper } from "@/components/molecules/GoogleMapsWrapper";
import { useBookingStore } from "@/hooks/use-booking-store";
import { cn } from "@/lib/utils";

import { Step1Contact } from "./Step1Contact";
import { Step2Origin } from "./Step2Origin";
import { Step3Destination } from "./Step3Destination";
import { Step4Parcel } from "./Step4Parcel";
import { Step5Speed } from "./Step5Speed";

const STEP_SUBTITLE_KEYS = [
  "stepContactSubtitle",
  "stepOriginSubtitle",
  "stepDestinationSubtitle",
  "stepParcelSubtitle",
  "stepSpeedSubtitle",
] as const;

export function RequestDeliverySection() {
  const t = useTranslations("booking");
  const currentStep = useBookingStore((s) => s.currentStep);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const prevStepRef = useRef(currentStep);

  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      setDirection(currentStep > prevStepRef.current ? "forward" : "backward");
      prevStepRef.current = currentStep;
    }
  }, [currentStep]);

  return (
    <GoogleMapsWrapper>
      <div className="bg-secondary-100 min-h-screen px-4 pt-14 pb-24 sm:px-6 sm:py-18 sm:pb-30 lg:px-10 lg:py-24">
        <SectionContainer>
          <div className="animate-fade-in mb-10 text-center sm:mb-14">
            <Heading variant="page" as="h1" className="mb-3">
              {t("title")}
            </Heading>
            <Text variant="body" className="text-text-muted mx-auto max-w-lg">
              {t(STEP_SUBTITLE_KEYS[currentStep - 1])}
            </Text>
          </div>

          <div className="mx-auto max-w-2xl">
            <BookingStepper currentStep={currentStep} />
          </div>

          <div
            className={cn(
              "mx-auto overflow-x-hidden",
              currentStep === 2 || currentStep === 3 ? "max-w-4xl" : "max-w-2xl"
            )}
          >
            <div
              key={currentStep}
              className={cn(
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              )}
            >
              {currentStep === 1 && <Step1Contact />}
              {currentStep === 2 && <Step2Origin />}
              {currentStep === 3 && <Step3Destination />}
              {currentStep === 4 && <Step4Parcel />}
              {currentStep === 5 && <Step5Speed />}
            </div>
          </div>
        </SectionContainer>
      </div>
    </GoogleMapsWrapper>
  );
}
