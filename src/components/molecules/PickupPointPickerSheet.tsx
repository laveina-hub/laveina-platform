"use client";

import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button, Input } from "@/components/atoms";
import { ChevronIcon, CloseIcon, SearchIcon } from "@/components/icons";
import { PickupPointDetailCard } from "@/components/molecules/PickupPointDetailCard";
import { WeeklySchedule } from "@/components/molecules/WeeklySchedule";
import { haversineKm } from "@/lib/geo";
import { rankPickupPoints } from "@/lib/pickup-point/ranking";
import { isOpenNow } from "@/lib/pickup-point/working-hours";
import { cn } from "@/lib/utils";
import type { PickupPoint } from "@/types/pickup-point";

const PickupPointMap = dynamic(() => import("./PickupPointMap").then((mod) => mod.PickupPointMap), {
  ssr: false,
  loading: () => <div className="bg-primary-50 h-full w-full animate-pulse" />,
});

// Full-screen mobile pickup picker — shown on < lg viewports when the user
// taps "Choose pickup point" on Step 2. Matches Select pickup point.png +
// the V2 "Location details" overlay that appears when a map marker is tapped.
//
// Selection state is local: the caller only sees the final point via onConfirm.
// Closing without confirming does NOT mutate the caller's selection.

export type PickupPointPickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Active tab on open; caller controls it so FROM/TO switching survives re-opens. */
  side: "origin" | "destination";
  /** Q7.3 — called when user taps the inactive tab. Parent flips `side`. */
  onSwitchSide?: (next: "origin" | "destination") => void;
  postcode: string;
  points: PickupPoint[];
  /** Currently committed selection (seeds local pending state on open). */
  initialSelectedId: string | null;
  /** Used to compute distance shown on destination cards. */
  originReference?: PickupPoint | null;
  onConfirm: (point: PickupPoint) => void;
  isLoading?: boolean;
};

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

export function PickupPointPickerSheet({
  open,
  onOpenChange,
  side,
  onSwitchSide,
  postcode,
  points,
  initialSelectedId,
  originReference,
  onConfirm,
  isLoading,
}: PickupPointPickerSheetProps) {
  const t = useTranslations("booking");

  // Local pending state — committed to the parent only on Confirm.
  const [pendingId, setPendingId] = useState<string | null>(initialSelectedId);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [nearestFirst, setNearestFirst] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  // Q6.5 — in-sheet text search, reset whenever the sheet re-opens.
  const [searchTerm, setSearchTerm] = useState("");

  // Re-seed pending when the sheet is re-opened with a different committed selection.
  useEffect(() => {
    if (open) {
      setPendingId(initialSelectedId);
      setDetailOpen(false);
      setSearchTerm("");
    }
  }, [open, initialSelectedId]);

  const displayPoints = useMemo(() => {
    let result = [...points];
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        [p.name, p.address, p.postcode].some((field) => field?.toLowerCase().includes(q))
      );
    }
    if (openNowOnly) result = result.filter((p) => isOpenNow(p.working_hours));
    if (nearestFirst && originReference) {
      result.sort((a, b) => haversineKm(originReference, a) - haversineKm(originReference, b));
    } else if (nearestFirst) {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [points, searchTerm, openNowOnly, nearestFirst, originReference]);

  // Q6.10 — rank visible points; destination uses origin reference, origin
  // side has no reference (shows "Open Now" badge on the first open point).
  const rankMap = useMemo(
    () =>
      rankPickupPoints(displayPoints, side === "destination" ? (originReference ?? null) : null),
    [displayPoints, originReference, side]
  );

  const pendingPoint = useMemo(
    () => points.find((p) => p.id === pendingId) ?? null,
    [points, pendingId]
  );

  function handleMarkerTap(id: string) {
    setPendingId(id);
    setDetailOpen(true);
  }

  function handleCardTap(p: PickupPoint) {
    setPendingId(p.id);
    setDetailOpen(false);
  }

  function handleConfirm() {
    if (!pendingPoint) return;
    onConfirm(pendingPoint);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom fixed inset-0 z-50 flex h-dvh w-full flex-col bg-white"
          aria-describedby={undefined}
        >
          <header className="border-border-muted flex flex-col gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={t("back")}
                  className="text-text-primary hover:bg-bg-muted -ml-1 rounded-full p-1.5"
                >
                  <ChevronIcon className="h-5 w-5" />
                </button>
              </Dialog.Close>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-text-primary truncate text-base font-semibold">
                  {t("selectPickupPointTitle")}
                </Dialog.Title>
                {postcode && (
                  <p className="text-text-muted truncate text-xs">
                    {t(side === "origin" ? "fromLabel" : "toLabel")} · {postcode}
                  </p>
                )}
              </div>
            </div>

            {onSwitchSide && (
              <div
                role="tablist"
                aria-label={t("pickupTabsAriaLabel")}
                className="bg-bg-muted flex gap-1 rounded-xl p-1"
              >
                {(["origin", "destination"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={side === tab}
                    onClick={() => onSwitchSide(tab)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none",
                      side === tab
                        ? "text-text-primary bg-white shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    {t(tab === "origin" ? "fromLabel" : "toLabel")}
                  </button>
                ))}
              </div>
            )}
          </header>

          <div className="relative flex-1 overflow-hidden">
            <PickupPointMap
              groups={[
                {
                  side,
                  points: displayPoints,
                  selectedPointId: pendingId,
                  onSelectPoint: handleMarkerTap,
                },
              ]}
              mapAriaLabel={t("selectPickupPointTitle")}
              className="h-full"
            />
          </div>

          <div className="border-border-muted flex flex-col gap-3 border-t bg-white px-4 py-3">
            {points.length > 0 && (
              <div className="relative">
                <SearchIcon className="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("filterPickupPoints")}
                  className="pl-9"
                  aria-label={t("filterPickupPoints")}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
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
              {(openNowOnly || nearestFirst || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setOpenNowOnly(false);
                    setNearestFirst(false);
                    setSearchTerm("");
                  }}
                  className="text-text-muted hover:text-text-primary ml-auto text-xs font-medium underline-offset-2 hover:underline"
                >
                  {t("filterClearAll")}
                </button>
              )}
            </div>

            {detailOpen && pendingPoint ? (
              <LocationDetailsOverlay
                point={pendingPoint}
                distanceKm={
                  side === "destination" && originReference
                    ? haversineKm(originReference, pendingPoint)
                    : undefined
                }
                onClose={() => setDetailOpen(false)}
                onConfirm={handleConfirm}
              />
            ) : (
              <>
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                  {isLoading && displayPoints.length === 0 && (
                    <div className="bg-bg-secondary h-24 w-72 shrink-0 animate-pulse rounded-2xl" />
                  )}
                  {displayPoints.map((point) => (
                    <PickupPointDetailCard
                      key={point.id}
                      point={point}
                      selected={pendingId === point.id}
                      onSelect={() => handleCardTap(point)}
                      distanceKm={
                        side === "destination" && originReference
                          ? haversineKm(originReference, point)
                          : undefined
                      }
                      rankBadge={rankMap.get(point.id) ?? null}
                    />
                  ))}
                  {!isLoading && displayPoints.length === 0 && (
                    <p className="text-text-muted py-4 text-sm">
                      {searchTerm.trim() || openNowOnly || nearestFirst
                        ? t("filterNoResults")
                        : t("noPickupPointsForPostcode")}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleConfirm}
                  disabled={!pendingPoint}
                  className="w-full"
                >
                  {t("confirmPickupPoint")}
                </Button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// V2 inner overlay: slides in from the bottom of the picker when the user
// taps a marker. Shows compact details + Confirm CTA.

type LocationDetailsOverlayProps = {
  point: PickupPoint;
  distanceKm?: number;
  onClose: () => void;
  onConfirm: () => void;
};

function LocationDetailsOverlay({
  point,
  distanceKm,
  onClose,
  onConfirm,
}: LocationDetailsOverlayProps) {
  const t = useTranslations("booking");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div className="border-border-muted flex flex-col gap-3 rounded-2xl border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-text-primary text-sm font-semibold">{t("locationDetailsTitle")}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("back")}
          className="text-text-muted hover:bg-bg-muted rounded-md p-1"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <PickupPointDetailCard
        point={point}
        selected
        onSelect={() => {}}
        distanceKm={distanceKm}
        className="w-full"
      />

      <div>
        <button
          type="button"
          onClick={() => setScheduleOpen((v) => !v)}
          aria-expanded={scheduleOpen}
          className="text-text-primary hover:text-primary-700 inline-flex items-center gap-1 text-xs font-medium"
        >
          {scheduleOpen ? t("weeklyScheduleHide") : t("weeklyScheduleShow")}
          <ChevronIcon direction={scheduleOpen ? "up" : "down"} className="h-3 w-3" />
        </button>
        {scheduleOpen && <WeeklySchedule workingHours={point.working_hours} className="mt-2" />}
      </div>

      <Button type="button" variant="primary" size="md" onClick={onConfirm} className="w-full">
        {t("confirmPickupPoint")}
      </Button>
    </div>
  );
}
