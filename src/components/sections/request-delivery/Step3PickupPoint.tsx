"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button, Text } from "@/components/atoms";
import { ChevronIcon } from "@/components/icons";
import { PickupPointDetailCard } from "@/components/molecules";
import { useBookingStore } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { isOpenNow } from "@/lib/pickup-point/working-hours";
import { cn } from "@/lib/utils";
import type { PickupPoint } from "@/types/pickup-point";

const PickupPointMap = dynamic(
  () => import("@/components/molecules/PickupPointMap").then((mod) => mod.PickupPointMap),
  { ssr: false, loading: () => <div className="bg-primary-50 h-72 animate-pulse rounded-xl" /> }
);

// One step, two sub-screens driven by `pickingFor` local state: origin first,
// then destination, then advance to Step 4. Seeds from any selection made on
// Step 2.

type Side = "origin" | "destination";

type FilterChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none",
        active
          ? "border-primary-500 bg-primary-50 text-primary-700"
          : "border-border-default text-text-muted hover:border-primary-300 bg-white"
      )}
    >
      {label}
    </button>
  );
}

export function Step3PickupPoint() {
  const t = useTranslations("booking");
  const { origin, destination, setOrigin, setDestination, setStep } = useBookingStore();

  // Start on the side that's not yet selected; fall back to origin first.
  const initialSide: Side = origin?.pickupPointId ? "destination" : "origin";
  const [pickingFor, setPickingFor] = useState<Side>(initialSide);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [nearestFirst, setNearestFirst] = useState(false);

  const activeLocation = pickingFor === "origin" ? origin : destination;
  const postcode = activeLocation?.postcode;
  const { data: allPoints = [], isFetching } = usePickupPoints(
    postcode && postcode.length === 5 ? postcode : undefined
  );

  const displayPoints = useMemo(() => {
    let result = [...allPoints];
    if (openNowOnly) result = result.filter((p) => isOpenNow(p.working_hours));
    if (nearestFirst) {
      // Real Haversine sort ships with Phase 4.7 GPS; fall back to name.
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [allPoints, openNowOnly, nearestFirst]);

  const currentSelectedId = activeLocation?.pickupPointId ?? null;

  // Drop a stale selection when the postcode changes and the previously
  // selected point is no longer in the fetched list.
  useEffect(() => {
    if (!currentSelectedId) return;
    if (!allPoints.some((p) => p.id === currentSelectedId)) {
      if (pickingFor === "origin" && origin) {
        setOrigin({ ...origin, pickupPointId: null });
      } else if (pickingFor === "destination" && destination) {
        setDestination({ ...destination, pickupPointId: null });
      }
    }
  }, [allPoints, currentSelectedId, pickingFor, origin, destination, setOrigin, setDestination]);

  function handleSelect(point: PickupPoint) {
    if (pickingFor === "origin") {
      setOrigin({ postcode: postcode ?? point.postcode, pickupPointId: point.id });
    } else {
      setDestination({ postcode: postcode ?? point.postcode, pickupPointId: point.id });
    }
  }

  function handleBack() {
    if (pickingFor === "destination") {
      setPickingFor("origin");
    } else {
      setStep(2);
    }
  }

  function handleConfirm() {
    if (pickingFor === "origin") {
      setPickingFor("destination");
    } else {
      setStep(4);
    }
  }

  const canConfirm = !!currentSelectedId;

  if (!postcode || postcode.length !== 5) {
    return (
      <div className="border-border-muted rounded-2xl border bg-white p-8 text-center">
        <Text variant="body" className="text-text-muted mb-4">
          {t("noPickupPointsForPostcode")}
        </Text>
        <Button type="button" variant="outline" size="md" onClick={() => setStep(2)}>
          <ChevronIcon className="mr-1 h-4 w-4" />
          {t("back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Text variant="body" className="text-text-muted">
          {t("selectPickupPointSubtitle", { side: pickingFor })}
        </Text>
      </div>

      <div className="h-72 overflow-hidden rounded-2xl sm:h-80">
        <PickupPointMap
          groups={[
            {
              side: pickingFor,
              points: displayPoints,
              selectedPointId: currentSelectedId,
              onSelectPoint: (id) => {
                const p = displayPoints.find((x) => x.id === id);
                if (p) handleSelect(p);
              },
            },
          ]}
          mapAriaLabel={t("selectPickupPointTitle")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label={t("filterOpenNow")}
          active={openNowOnly}
          onClick={() => setOpenNowOnly((v) => !v)}
        />
        <FilterChip
          label={t("filterNearestFirst")}
          active={nearestFirst}
          onClick={() => setNearestFirst((v) => !v)}
        />
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {isFetching && displayPoints.length === 0 && (
          <div className="bg-bg-secondary h-24 w-72 shrink-0 animate-pulse rounded-2xl" />
        )}
        {displayPoints.map((point) => (
          <PickupPointDetailCard
            key={point.id}
            point={point}
            selected={currentSelectedId === point.id}
            onSelect={() => handleSelect(point)}
          />
        ))}
        {!isFetching && displayPoints.length === 0 && (
          <Text variant="body" className="text-text-muted py-4">
            {t("noPickupPointsForPostcode")}
          </Text>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" size="md" onClick={handleBack}>
          <ChevronIcon className="mr-1 h-4 w-4" />
          {t("back")}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {t("confirmPickupPoint")}
        </Button>
      </div>
    </div>
  );
}
