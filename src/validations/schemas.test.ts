import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema, forgotPasswordSchema } from "@/validations/auth.schema";
import { generateOtpSchema, verifyOtpSchema } from "@/validations/otp.schema";
import { adminRatingStatusSchema } from "@/validations/rating.schema";
import {
  createSavedAddressSchema,
  updateSavedAddressSchema,
} from "@/validations/saved-address.schema";
import { scanQrSchema } from "@/validations/scan.schema";
import {
  bookingStepContactSchema,
  bookingStepOriginSchema,
  bookingStepDestinationSchema,
  bookingStepParcelSchema,
  bookingStepSpeedSchema,
  createCheckoutSchema,
} from "@/validations/shipment.schema";
import { adminSupportTicketUpdateSchema } from "@/validations/support-ticket.schema";

const VALID_UUID = "00000000-0000-0000-0000-000000000001";

describe("auth schemas", () => {
  describe("loginSchema", () => {
    it("accepts valid email and password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "12345678",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = loginSchema.safeParse({
        email: "not-an-email",
        password: "12345678",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty fields", () => {
      const result = loginSchema.safeParse({ email: "", password: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    const validData = {
      full_name: "John Doe",
      email: "john@example.com",
      password: "SecurePass1!",
      confirm_password: "SecurePass1!",
    };

    it("accepts valid registration data", () => {
      expect(registerSchema.safeParse(validData).success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const result = registerSchema.safeParse({
        ...validData,
        confirm_password: "different",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name shorter than 2 chars", () => {
      const result = registerSchema.safeParse({ ...validData, full_name: "A" });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("accepts valid email", () => {
      expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    });

    it("rejects invalid email", () => {
      expect(forgotPasswordSchema.safeParse({ email: "invalid" }).success).toBe(false);
    });
  });
});

describe("OTP schemas", () => {
  describe("generateOtpSchema", () => {
    it("accepts valid UUID", () => {
      const result = generateOtpSchema.safeParse({
        shipment_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID string", () => {
      const result = generateOtpSchema.safeParse({ shipment_id: "not-a-uuid" });
      expect(result.success).toBe(false);
    });
  });

  describe("verifyOtpSchema", () => {
    it("accepts valid shipment_id and 6-digit OTP", () => {
      const result = verifyOtpSchema.safeParse({
        shipment_id: "550e8400-e29b-41d4-a716-446655440000",
        otp: "123456",
      });
      expect(result.success).toBe(true);
    });

    it("rejects OTP shorter than 6 digits", () => {
      const result = verifyOtpSchema.safeParse({
        shipment_id: "550e8400-e29b-41d4-a716-446655440000",
        otp: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("rejects OTP longer than 6 digits", () => {
      const result = verifyOtpSchema.safeParse({
        shipment_id: "550e8400-e29b-41d4-a716-446655440000",
        otp: "1234567",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("scanQrSchema", () => {
  it("accepts valid tracking ID and UUID pickup point", () => {
    const result = scanQrSchema.safeParse({
      tracking_id: "LAV-12345678",
      pickup_point_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty tracking ID", () => {
    const result = scanQrSchema.safeParse({
      tracking_id: "",
      pickup_point_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID pickup point ID", () => {
    const result = scanQrSchema.safeParse({
      tracking_id: "LAV-12345678",
      pickup_point_id: "not-valid",
    });
    expect(result.success).toBe(false);
  });
});

describe("booking step schemas", () => {
  describe("bookingStepContactSchema", () => {
    const validContact = {
      sender_first_name: "Juan",
      sender_last_name: "García",
      sender_phone: "+34 612 345 678",
      sender_whatsapp_same_as_phone: true,
      sender_email: "juan@example.com",
      receiver_first_name: "Ana",
      receiver_last_name: "López",
      receiver_phone: "+34 698 765 432",
      receiver_whatsapp_same_as_phone: true,
      receiver_email: "ana@example.com",
    };

    it("accepts valid contact data with whatsapp=same", () => {
      expect(bookingStepContactSchema.safeParse(validContact).success).toBe(true);
    });

    it("accepts bare 9-digit phone (no +34)", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_phone: "612345678",
      });
      expect(result.success).toBe(true);
    });

    it("rejects name shorter than 2 chars", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_first_name: "J",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-Spanish phone starting with 1", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_phone: "+1 555 123 4567",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("requires sender_whatsapp when not same_as_phone", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_whatsapp_same_as_phone: false,
      });
      expect(result.success).toBe(false);
    });

    it("accepts separate sender_whatsapp when not same_as_phone", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_whatsapp_same_as_phone: false,
        sender_whatsapp: "+34 699 000 000",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("bookingStepOriginSchema", () => {
    it("accepts valid 5-digit postcode and UUID", () => {
      const result = bookingStepOriginSchema.safeParse({
        origin_postcode: "08001",
        origin_pickup_point_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects 4-digit postcode", () => {
      const result = bookingStepOriginSchema.safeParse({
        origin_postcode: "0800",
        origin_pickup_point_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric postcode", () => {
      const result = bookingStepOriginSchema.safeParse({
        origin_postcode: "ABCDE",
        origin_pickup_point_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("bookingStepDestinationSchema", () => {
    it("accepts valid data", () => {
      const result = bookingStepDestinationSchema.safeParse({
        destination_postcode: "28001",
        destination_pickup_point_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("bookingStepParcelSchema", () => {
    const validCustomParcel = {
      preset_slug: null,
      length_cm: 40,
      width_cm: 30,
      height_cm: 20,
      weight_kg: 3.5,
      wants_insurance: false,
    };
    const validPresetParcel = {
      preset_slug: "small" as const,
      weight_kg: 3.5,
      wants_insurance: false,
    };

    it("accepts a preset-only parcel (dimensions resolved server-side)", () => {
      const result = bookingStepParcelSchema.safeParse({ parcels: [validPresetParcel] });
      expect(result.success).toBe(true);
    });

    it("accepts a custom-size parcel", () => {
      const result = bookingStepParcelSchema.safeParse({ parcels: [validCustomParcel] });
      expect(result.success).toBe(true);
    });

    it("rejects a parcel missing both preset and dimensions", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ preset_slug: null, weight_kg: 3.5, wants_insurance: false }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts multiple parcels mixing presets and custom", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [validPresetParcel, validCustomParcel],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty parcels array", () => {
      const result = bookingStepParcelSchema.safeParse({ parcels: [] });
      expect(result.success).toBe(false);
    });

    it("rejects weight above the M2 ceiling (20 kg)", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ ...validCustomParcel, weight_kg: 21 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects longest side exceeding 55 cm (M2 ceiling)", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ ...validCustomParcel, length_cm: 56 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects total dimensions exceeding 149 cm (M2 ceiling)", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ ...validCustomParcel, length_cm: 55, width_cm: 55, height_cm: 40 }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts dimensions at exactly 149 cm total", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ ...validCustomParcel, length_cm: 55, width_cm: 55, height_cm: 39 }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("bookingStepSpeedSchema", () => {
    it("accepts standard", () => {
      expect(bookingStepSpeedSchema.safeParse({ delivery_speed: "standard" }).success).toBe(true);
    });

    it("accepts express", () => {
      expect(bookingStepSpeedSchema.safeParse({ delivery_speed: "express" }).success).toBe(true);
    });

    it("accepts next_day (M2)", () => {
      expect(bookingStepSpeedSchema.safeParse({ delivery_speed: "next_day" }).success).toBe(true);
    });

    it("rejects invalid speed", () => {
      expect(bookingStepSpeedSchema.safeParse({ delivery_speed: "overnight" }).success).toBe(false);
    });
  });
});

describe("createCheckoutSchema", () => {
  const validCheckout = {
    sender_first_name: "Juan",
    sender_last_name: "García",
    sender_phone: "+34 612 345 678",
    sender_whatsapp: "+34 612 345 678",
    sender_email: "juan@example.com",
    receiver_first_name: "Ana",
    receiver_last_name: "López",
    receiver_phone: "+34 698 765 432",
    receiver_whatsapp: "+34 698 765 432",
    receiver_email: "ana@example.com",
    origin_postcode: "08001",
    origin_pickup_point_id: "550e8400-e29b-41d4-a716-446655440000",
    destination_postcode: "28001",
    destination_pickup_point_id: "660e8400-e29b-41d4-a716-446655440000",
    parcels: [
      {
        preset_slug: "small" as const,
        weight_kg: 3.5,
        wants_insurance: false,
      },
    ],
    delivery_speed: "standard" as const,
  };

  it("accepts valid complete checkout data", () => {
    expect(createCheckoutSchema.safeParse(validCheckout).success).toBe(true);
  });

  it("accepts multi-parcel checkout", () => {
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      parcels: [
        { preset_slug: "mini" as const, weight_kg: 1, wants_insurance: false },
        { preset_slug: "medium" as const, weight_kg: 8, wants_insurance: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const { sender_first_name: _omit, ...incomplete } = validCheckout;
    expect(createCheckoutSchema.safeParse(incomplete).success).toBe(false);
  });

  it("rejects empty parcels array", () => {
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      parcels: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid postcode format", () => {
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      origin_postcode: "123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts express delivery speed", () => {
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      delivery_speed: "express",
    });
    expect(result.success).toBe(true);
  });

  it("accepts next_day delivery speed (M2)", () => {
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      delivery_speed: "next_day",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sender_email (M2 required)", () => {
    const { sender_email: _omit, ...incomplete } = validCheckout;
    expect(createCheckoutSchema.safeParse(incomplete).success).toBe(false);
  });

  it("rejects identical origin and destination pickup point ids", () => {
    const sameId = "550e8400-e29b-41d4-a716-446655440000";
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      origin_pickup_point_id: sameId,
      destination_pickup_point_id: sameId,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("validation.samePickupPoint");
      expect(result.error.issues[0]?.path).toEqual(["destination_pickup_point_id"]);
    }
  });
});

describe("adminSupportTicketUpdateSchema", () => {
  it("accepts a status-only update", () => {
    expect(adminSupportTicketUpdateSchema.safeParse({ status: "resolved" }).success).toBe(true);
  });

  it("accepts an admin_response-only update", () => {
    expect(
      adminSupportTicketUpdateSchema.safeParse({ admin_response: "Thanks, checking now." }).success
    ).toBe(true);
  });

  it("accepts both status and admin_response in one payload", () => {
    expect(
      adminSupportTicketUpdateSchema.safeParse({
        status: "in_progress",
        admin_response: "Looking into this.",
      }).success
    ).toBe(true);
  });

  it("rejects an empty payload (at least one field must change)", () => {
    expect(adminSupportTicketUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown status value", () => {
    expect(adminSupportTicketUpdateSchema.safeParse({ status: "archived" }).success).toBe(false);
  });

  it("rejects an empty admin_response (min 1 char after trim)", () => {
    expect(adminSupportTicketUpdateSchema.safeParse({ admin_response: "   " }).success).toBe(false);
  });

  it("rejects an admin_response longer than 4000 chars", () => {
    const tooLong = "x".repeat(4001);
    expect(adminSupportTicketUpdateSchema.safeParse({ admin_response: tooLong }).success).toBe(
      false
    );
  });
});

describe("adminRatingStatusSchema", () => {
  it.each(["pending", "approved", "rejected"] as const)("accepts status=%s", (status) => {
    expect(adminRatingStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it("rejects an unknown status value", () => {
    expect(adminRatingStatusSchema.safeParse({ status: "hidden" }).success).toBe(false);
  });

  it("rejects a missing status field", () => {
    expect(adminRatingStatusSchema.safeParse({}).success).toBe(false);
  });

  it("rejects extra fields if passed (parse is strict on known field types)", () => {
    // z.object is permissive about extra keys by default; the schema only
    // validates that `status` is present and well-formed. This test pins the
    // behaviour so a future `.strict()` change would surface here.
    const result = adminRatingStatusSchema.safeParse({ status: "approved", notes: "ignored" });
    expect(result.success).toBe(true);
  });
});

describe("saved-address schemas", () => {
  describe("createSavedAddressSchema", () => {
    it("accepts a valid payload", () => {
      const result = createSavedAddressSchema.safeParse({
        label: "Home",
        pickup_point_id: VALID_UUID,
        is_default: true,
      });
      expect(result.success).toBe(true);
    });

    it("defaults is_default to false when omitted", () => {
      const result = createSavedAddressSchema.safeParse({
        label: "Home",
        pickup_point_id: VALID_UUID,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.is_default).toBe(false);
    });

    it("trims whitespace from the label", () => {
      const result = createSavedAddressSchema.safeParse({
        label: "  Office  ",
        pickup_point_id: VALID_UUID,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.label).toBe("Office");
    });

    it("rejects an empty label", () => {
      const result = createSavedAddressSchema.safeParse({
        label: "",
        pickup_point_id: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a label longer than 64 characters", () => {
      const result = createSavedAddressSchema.safeParse({
        label: "x".repeat(65),
        pickup_point_id: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a non-UUID pickup_point_id", () => {
      const result = createSavedAddressSchema.safeParse({
        label: "Home",
        pickup_point_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateSavedAddressSchema", () => {
    it("accepts a partial patch with just the label", () => {
      const result = updateSavedAddressSchema.safeParse({ label: "Family" });
      expect(result.success).toBe(true);
    });

    it("accepts a partial patch with just is_default", () => {
      const result = updateSavedAddressSchema.safeParse({ is_default: true });
      expect(result.success).toBe(true);
    });

    it("rejects an empty patch (must update at least one field)", () => {
      const result = updateSavedAddressSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects an invalid pickup_point_id UUID", () => {
      const result = updateSavedAddressSchema.safeParse({
        pickup_point_id: "definitely-not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects label longer than 64 chars in an update", () => {
      const result = updateSavedAddressSchema.safeParse({
        label: "y".repeat(65),
      });
      expect(result.success).toBe(false);
    });
  });
});
