import { z } from "zod";

const timeSlotSchema = z.tuple([
  z.string().regex(/^\d{2}:\d{2}$/),
  z.string().regex(/^\d{2}:\d{2}$/),
]);

const dayScheduleSchema = z.object({
  open: z.boolean(),
  slots: z.array(timeSlotSchema),
});

export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];
export type TimeSlot = [string, string];
export type DaySchedule = { open: boolean; slots: TimeSlot[] };
export type WorkingHours = Record<WeekDay, DaySchedule>;

export const workingHoursSchema = z.record(z.enum(WEEK_DAYS), dayScheduleSchema);

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: {
    open: true,
    slots: [
      ["09:00", "14:00"],
      ["16:00", "20:00"],
    ],
  },
  tuesday: {
    open: true,
    slots: [
      ["09:00", "14:00"],
      ["16:00", "20:00"],
    ],
  },
  wednesday: {
    open: true,
    slots: [
      ["09:00", "14:00"],
      ["16:00", "20:00"],
    ],
  },
  thursday: {
    open: true,
    slots: [
      ["09:00", "14:00"],
      ["16:00", "20:00"],
    ],
  },
  friday: {
    open: true,
    slots: [
      ["09:00", "14:00"],
      ["16:00", "20:00"],
    ],
  },
  saturday: { open: true, slots: [["10:00", "14:00"]] },
  sunday: { open: false, slots: [] },
};

/** Parses legacy string-based working hours ("09:00-14:00,16:00-20:00" or "closed"). */
export function parseWorkingHours(raw: unknown): WorkingHours {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_WORKING_HOURS };

  // SAFETY: We checked `typeof raw === "object"` above, so this is a valid object cast
  const record = raw as Record<string, unknown>;

  const firstValue = Object.values(record)[0];
  if (firstValue && typeof firstValue === "object" && "open" in firstValue) {
    const result = { ...DEFAULT_WORKING_HOURS };
    for (const day of WEEK_DAYS) {
      const entry = record[day];
      if (entry && typeof entry === "object" && "open" in entry) {
        // SAFETY: Guarded by `"open" in entry` check — matches DaySchedule shape
        result[day] = entry as DaySchedule;
      }
    }
    return result;
  }

  const result = { ...DEFAULT_WORKING_HOURS };
  for (const day of WEEK_DAYS) {
    const value = record[day];
    if (typeof value !== "string" || !value || value.toLowerCase() === "closed") {
      result[day] = { open: false, slots: [] };
      continue;
    }
    const slots: TimeSlot[] = value
      .split(",")
      // SAFETY: Split on "-" produces [start, end] which matches TimeSlot tuple
      .map((range) => range.trim().split("-") as TimeSlot)
      .filter(([start, end]) => start && end);
    result[day] = { open: slots.length > 0, slots };
  }
  return result;
}

export const createPickupPointSchema = z.object({
  name: z.string().min(2, "validation.nameMin"),
  address: z.string().min(5, "validation.addressMin"),
  postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  working_hours: workingHoursSchema.optional(),
});

export const updatePickupPointSchema = createPickupPointSchema.partial().extend({
  is_active: z.boolean().optional(),
  is_open: z.boolean().optional(),
});

export type CreatePickupPointInput = z.infer<typeof createPickupPointSchema>;
export type UpdatePickupPointInput = z.infer<typeof updatePickupPointSchema>;
