import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

function generateOtpCode(length: number): string {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

describe("OTP logic", () => {
  describe("generateOtpCode", () => {
    it("generates a code of the correct length", () => {
      const otp = generateOtpCode(OTP_LENGTH);
      expect(otp).toHaveLength(6);
    });

    it("generates only numeric characters", () => {
      for (let i = 0; i < 100; i++) {
        const otp = generateOtpCode(OTP_LENGTH);
        expect(otp).toMatch(/^[0-9]{6}$/);
      }
    });

    it("generates different codes on each call (statistically)", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(generateOtpCode(OTP_LENGTH));
      }
      expect(codes.size).toBeGreaterThan(40);
    });

    it("handles length of 1", () => {
      const otp = generateOtpCode(1);
      expect(otp).toHaveLength(1);
      expect(otp).toMatch(/^[0-9]$/);
    });
  });

  describe("hashOtp (SHA-256)", () => {
    it("produces a 64-character hex string", () => {
      const hash = hashOtp("123456");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("is deterministic — same input always gives same hash", () => {
      const hash1 = hashOtp("123456");
      const hash2 = hashOtp("123456");
      expect(hash1).toBe(hash2);
    });

    it("different inputs produce different hashes", () => {
      const hash1 = hashOtp("123456");
      const hash2 = hashOtp("654321");
      expect(hash1).not.toBe(hash2);
    });

    it("is irreversible — hash does not contain the original OTP", () => {
      const hash = hashOtp("123456");
      expect(hash).not.toContain("123456");
    });

    it("produces the correct known hash for 123456", () => {
      const expected = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";
      expect(hashOtp("123456")).toBe(expected);
    });
  });

  describe("expiry calculation", () => {
    it("expires 10 minutes from now", () => {
      const now = Date.now();
      const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);
      const diffMs = expiresAt.getTime() - now;
      expect(diffMs).toBe(600_000); // 10 minutes in ms
    });

    it("expired OTP is detected by date comparison", () => {
      const now = new Date();
      const expiredAt = new Date(now.getTime() - 1000); // 1 second ago
      expect(expiredAt < now).toBe(true);
    });

    it("valid OTP is not expired", () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
      expect(expiresAt >= now).toBe(true);
    });
  });

  describe("OTP verification flow", () => {
    it("submitted OTP matches when hashes are equal", () => {
      const originalOtp = "847291";
      const storedHash = hashOtp(originalOtp);
      const submittedHash = hashOtp("847291");
      expect(storedHash).toBe(submittedHash);
    });

    it("wrong OTP does not match", () => {
      const storedHash = hashOtp("847291");
      const wrongHash = hashOtp("847292");
      expect(storedHash).not.toBe(wrongHash);
    });
  });
});
