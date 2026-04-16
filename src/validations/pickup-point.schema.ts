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

  // SAFETY: typeof guard above
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
  name: z.string().min(2, "validation.nameMin").max(100, "validation.nameMax"),
  address: z.string().min(5, "validation.addressMin").max(200, "validation.addressMax"),
  postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  city: z.string().min(1).max(100, "validation.cityMax").optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-]{9,15}$/, "validation.phoneInvalid")
    .optional()
    .or(z.literal("")),
  email: z.string().email().optional(),
  working_hours: workingHoursSchema.optional(),
});

export const updatePickupPointSchema = createPickupPointSchema.partial().extend({
  is_active: z.boolean().optional(),
  is_open: z.boolean().optional(),
});

export type CreatePickupPointInput = z.infer<typeof createPickupPointSchema>;
export type UpdatePickupPointInput = z.infer<typeof updatePickupPointSchema>;

const CSV_HEADERS = [
  "Name",
  "Address",
  "Postcode",
  "City",
  "Latitude",
  "Longitude",
  "Phone",
  "Email",
  "Monday hours",
  "Tuesday hours",
  "Wednesday hours",
  "Thursday hours",
  "Friday hours",
  "Saturday hours",
  "Sunday hours",
  "Map link",
] as const;

export type CsvPickupPointRow = {
  name: string;
  address: string;
  postcode: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  working_hours: WorkingHours;
};

export type CsvParseResult = {
  rows: CsvPickupPointRow[];
  errors: Array<{ row: number; message: string }>;
};

/** Pad Spanish postcodes to 5 digits (e.g. "8036" → "08036"). */
function padPostcode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.padStart(5, "0");
}

/** Parse a single day's hours string like "09:00-14:00 16:00-20:00" into DaySchedule. */
function parseDayHours(raw: string): DaySchedule {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "closed") {
    return { open: false, slots: [] };
  }

  const slots: TimeSlot[] = trimmed
    .split(/\s+/)
    .map((range) => {
      const [start, end] = range.split("-");
      return [start?.trim(), end?.trim()] as TimeSlot;
    })
    .filter(
      ([start, end]) => start && end && /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)
    );

  return { open: slots.length > 0, slots };
}

/** Parse CSV text into validated pickup point rows. Auto-fixes postcodes and working hours. */
export function parseCsvPickupPoints(csvText: string): CsvParseResult {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }],
    };
  }

  const header = lines[0].split(",").map((h) => h.trim());
  const nameIndex = header.indexOf(CSV_HEADERS[0]);
  if (nameIndex === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Invalid CSV header. Expected: " + CSV_HEADERS.join(", ") }],
    };
  }

  const rows: CsvPickupPointRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < 8) {
      errors.push({ row: i + 1, message: "Not enough columns" });
      continue;
    }

    const postcode = padPostcode(values[2] ?? "");
    const lat = parseFloat(values[4] ?? "");
    const lng = parseFloat(values[5] ?? "");

    if (isNaN(lat) || isNaN(lng)) {
      errors.push({
        row: i + 1,
        message: `Invalid coordinates: lat=${values[4]}, lng=${values[5]}`,
      });
      continue;
    }

    if (!/^[0-9]{5}$/.test(postcode)) {
      errors.push({ row: i + 1, message: `Invalid postcode: ${values[2]}` });
      continue;
    }

    const working_hours: WorkingHours = {
      monday: parseDayHours(values[8] ?? ""),
      tuesday: parseDayHours(values[9] ?? ""),
      wednesday: parseDayHours(values[10] ?? ""),
      thursday: parseDayHours(values[11] ?? ""),
      friday: parseDayHours(values[12] ?? ""),
      saturday: parseDayHours(values[13] ?? ""),
      sunday: parseDayHours(values[14] ?? ""),
    };

    rows.push({
      name: values[0] ?? "",
      address: values[1] ?? "",
      postcode,
      city: values[3] ?? "",
      latitude: lat,
      longitude: lng,
      phone: values[6] ?? "",
      email: values[7] ?? "",
      working_hours,
    });
  }

  return { rows, errors };
}
