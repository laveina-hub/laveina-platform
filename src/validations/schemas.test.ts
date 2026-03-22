import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema, forgotPasswordSchema } from "@/validations/auth.schema";
import { generateOtpSchema, verifyOtpSchema } from "@/validations/otp.schema";
import { scanQrSchema } from "@/validations/scan.schema";
import {
  bookingStepContactSchema,
  bookingStepOriginSchema,
  bookingStepDestinationSchema,
  bookingStepParcelSchema,
  bookingStepSpeedSchema,
  createCheckoutSchema,
} from "@/validations/shipment.schema";

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

    it("rejects password shorter than 8 chars", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "1234567",
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
      password: "securepass",
      confirm_password: "securepass",
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
      sender_name: "Juan García",
      sender_phone: "+34 612 345 678",
      receiver_name: "Ana López",
      receiver_phone: "+34 698 765 432",
    };

    it("accepts valid contact data", () => {
      expect(bookingStepContactSchema.safeParse(validContact).success).toBe(true);
    });

    it("accepts phone without + prefix", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_phone: "612345678",
      });
      expect(result.success).toBe(true);
    });

    it("rejects name shorter than 2 chars", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_name: "J",
      });
      expect(result.success).toBe(false);
    });

    it("rejects phone with letters", () => {
      const result = bookingStepContactSchema.safeParse({
        ...validContact,
        sender_phone: "abc123",
      });
      expect(result.success).toBe(false);
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
    const validParcel = {
      parcel_size: "medium",
      weight_kg: 3.5,
      insurance_option_id: "550e8400-e29b-41d4-a716-446655440000",
    };

    it("accepts valid single parcel", () => {
      const result = bookingStepParcelSchema.safeParse({ parcels: [validParcel] });
      expect(result.success).toBe(true);
    });

    it("accepts multiple parcels", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [validParcel, { parcel_size: "small", weight_kg: 1, insurance_option_id: null }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts null insurance_option_id", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ parcel_size: "small", weight_kg: 1, insurance_option_id: null }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty parcels array", () => {
      const result = bookingStepParcelSchema.safeParse({ parcels: [] });
      expect(result.success).toBe(false);
    });

    it("rejects invalid parcel size", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ parcel_size: "huge", weight_kg: 1, insurance_option_id: null }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects weight above 25 kg", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ parcel_size: "xxl", weight_kg: 26, insurance_option_id: null }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero weight", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ parcel_size: "small", weight_kg: 0, insurance_option_id: null }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative weight", () => {
      const result = bookingStepParcelSchema.safeParse({
        parcels: [{ parcel_size: "small", weight_kg: -1, insurance_option_id: null }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts all 5 valid parcel sizes", () => {
      for (const size of ["small", "medium", "large", "extra_large", "xxl"]) {
        const result = bookingStepParcelSchema.safeParse({
          parcels: [{ parcel_size: size, weight_kg: 1, insurance_option_id: null }],
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("bookingStepSpeedSchema", () => {
    it("accepts standard", () => {
      expect(bookingStepSpeedSchema.safeParse({ delivery_speed: "standard" }).success).toBe(true);
    });

    it("accepts express", () => {
      expect(bookingStepSpeedSchema.safeParse({ delivery_speed: "express" }).success).toBe(true);
    });

    it("rejects invalid speed", () => {
      expect(bookingStepSpeedSchema.safeParse({ delivery_speed: "overnight" }).success).toBe(false);
    });
  });
});

describe("createCheckoutSchema", () => {
  const validCheckout = {
    sender_name: "Juan García",
    sender_phone: "+34 612 345 678",
    receiver_name: "Ana López",
    receiver_phone: "+34 698 765 432",
    origin_postcode: "08001",
    origin_pickup_point_id: "550e8400-e29b-41d4-a716-446655440000",
    destination_postcode: "28001",
    destination_pickup_point_id: "660e8400-e29b-41d4-a716-446655440000",
    parcels: [{ parcel_size: "medium" as const, weight_kg: 3.5, insurance_option_id: null }],
    delivery_speed: "standard" as const,
  };

  it("accepts valid complete checkout data", () => {
    expect(createCheckoutSchema.safeParse(validCheckout).success).toBe(true);
  });

  it("accepts multi-parcel checkout", () => {
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      parcels: [
        { parcel_size: "small", weight_kg: 1, insurance_option_id: null },
        { parcel_size: "large", weight_kg: 8, insurance_option_id: null },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const { sender_name: _, ...incomplete } = validCheckout;
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
});
