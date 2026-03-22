"use client";

import { Minus, Plus } from "lucide-react";
import { useCallback } from "react";

import { Label } from "@/components/atoms";
import { cn } from "@/lib/utils";
import type {
  DaySchedule,
  TimeSlot,
  WeekDay,
  WorkingHours,
} from "@/validations/pickup-point.schema";
import { WEEK_DAYS } from "@/validations/pickup-point.schema";

type WorkingHoursEditorProps = {
  value: WorkingHours;
  onChange: (value: WorkingHours) => void;
  t: (key: string) => string;
  className?: string;
};

const MAX_SLOTS = 3;

export function WorkingHoursEditor({ value, onChange, t, className }: WorkingHoursEditorProps) {
  const updateDay = useCallback(
    (day: WeekDay, schedule: DaySchedule) => {
      onChange({ ...value, [day]: schedule });
    },
    [value, onChange]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {WEEK_DAYS.map((day) => {
        const schedule = value[day];
        return (
          <DayRow
            key={day}
            day={day}
            schedule={schedule}
            onChange={(s) => updateDay(day, s)}
            t={t}
          />
        );
      })}
    </div>
  );
}

type DayRowProps = {
  day: WeekDay;
  schedule: DaySchedule;
  onChange: (schedule: DaySchedule) => void;
  t: (key: string) => string;
};

function DayRow({ day, schedule, onChange, t }: DayRowProps) {
  const toggleOpen = () => {
    if (schedule.open) {
      onChange({ open: false, slots: [] });
    } else {
      onChange({ open: true, slots: [["09:00", "18:00"]] });
    }
  };

  const updateSlot = (index: number, slot: TimeSlot) => {
    const slots = [...schedule.slots];
    slots[index] = slot;
    onChange({ ...schedule, slots });
  };

  const addSlot = () => {
    if (schedule.slots.length >= MAX_SLOTS) return;
    const lastEnd = schedule.slots[schedule.slots.length - 1]?.[1] ?? "14:00";
    onChange({ ...schedule, slots: [...schedule.slots, [lastEnd, "20:00"]] });
  };

  const removeSlot = (index: number) => {
    const slots = schedule.slots.filter((_, i) => i !== index);
    if (slots.length === 0) {
      onChange({ open: false, slots: [] });
    } else {
      onChange({ ...schedule, slots });
    }
  };

  return (
    <div className="flex items-start gap-3">
      <Label className="text-text-primary w-24 shrink-0 pt-2 text-sm font-medium">{t(day)}</Label>

      <button
        type="button"
        onClick={toggleOpen}
        className="mt-1.5 shrink-0"
        aria-label={schedule.open ? t("open") : t("closed")}
      >
        <div
          className={cn(
            "relative h-5 w-9 rounded-full transition",
            schedule.open ? "bg-success" : "bg-secondary-50"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
              schedule.open ? "translate-x-4.5" : "translate-x-0.5"
            )}
          />
        </div>
      </button>

      {schedule.open ? (
        <div className="flex flex-1 flex-wrap items-start gap-2">
          {schedule.slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="time"
                value={slot[0]}
                onChange={(e) => updateSlot(i, [e.target.value, slot[1]])}
                className="border-border-default text-text-primary focus:ring-primary-500 h-8 rounded-md border bg-white px-2 text-sm focus:ring-2 focus:outline-none"
              />
              <span className="text-text-muted text-xs">-</span>
              <input
                type="time"
                value={slot[1]}
                onChange={(e) => updateSlot(i, [slot[0], e.target.value])}
                className="border-border-default text-text-primary focus:ring-primary-500 h-8 rounded-md border bg-white px-2 text-sm focus:ring-2 focus:outline-none"
              />
              {schedule.slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  className="text-text-muted hover:bg-bg-muted hover:text-error ml-0.5 rounded p-0.5"
                  aria-label={t("removeSlot")}
                >
                  <Minus size={14} />
                </button>
              )}
            </div>
          ))}
          {schedule.slots.length < MAX_SLOTS && (
            <button
              type="button"
              onClick={addSlot}
              className="border-border-default text-text-muted hover:border-text-muted hover:text-text-primary flex h-8 items-center gap-1 rounded-md border border-dashed px-2 text-xs"
              aria-label={t("addSlot")}
            >
              <Plus size={14} />
              {t("addSlot")}
            </button>
          )}
        </div>
      ) : (
        <span className="text-text-muted pt-1.5 text-sm">{t("closed")}</span>
      )}
    </div>
  );
}

export type { WorkingHoursEditorProps };
