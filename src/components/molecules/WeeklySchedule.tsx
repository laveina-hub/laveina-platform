"use client";

import { useTranslations } from "next-intl";

import { getTodayWeekdayKey, type WorkingHoursDay } from "@/lib/pickup-point/working-hours";
import { cn } from "@/lib/utils";

// Q3.5 — 7-day schedule view. Consumes the same JSONB shape as
// `getTodayPrimarySlot`, but renders every weekday with its slot list
// ("Closed" when the day isn't open). Highlights today so the user can
// scan quickly.

const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

type WorkingHoursInput = unknown;

function parseWorkingHours(value: WorkingHoursInput): Partial<Record<WeekdayKey, WorkingHoursDay>> {
  if (!value || typeof value !== "object") return {};
  // SAFETY: `working_hours` is a JSONB column; the seed migration enforces
  // this shape and the renderer guards every nested access defensively.
  return value as Partial<Record<WeekdayKey, WorkingHoursDay>>;
}

function formatSlots(slots: WorkingHoursDay["slots"]): string[] {
  return slots
    .filter((slot): slot is [string, string] => Array.isArray(slot) && slot.length >= 2)
    .map(([from, to]) => `${from} – ${to}`);
}

export type WeeklyScheduleProps = {
  workingHours: WorkingHoursInput;
  className?: string;
};

export function WeeklySchedule({ workingHours, className }: WeeklyScheduleProps) {
  const t = useTranslations("booking");
  const map = parseWorkingHours(workingHours);
  const today = getTodayWeekdayKey();

  return (
    <dl className={cn("border-border-default rounded-lg border bg-white text-xs", className)}>
      {WEEKDAY_KEYS.map((day, i) => {
        const entry = map[day];
        const slotLines = entry?.open ? formatSlots(entry.slots) : [];
        const isToday = day === today;
        return (
          <div
            key={day}
            className={cn(
              "flex items-start justify-between gap-3 px-3 py-2",
              i !== WEEKDAY_KEYS.length - 1 && "border-border-muted border-b",
              isToday && "bg-primary-50/50"
            )}
          >
            <dt
              className={cn(
                "text-text-muted w-24 shrink-0 capitalize",
                isToday && "text-primary-700 font-semibold"
              )}
            >
              {t(`weekday.${day}`)}
            </dt>
            <dd
              className={cn(
                "text-right",
                slotLines.length > 0 ? "text-text-primary" : "text-text-muted"
              )}
            >
              {slotLines.length > 0 ? (
                slotLines.map((line) => <div key={line}>{line}</div>)
              ) : (
                <span>{t("closedToday")}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
