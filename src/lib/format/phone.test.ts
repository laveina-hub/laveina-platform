import { describe, expect, it } from "vitest";

import {
  formatSpanishPhone,
  isValidSpanishPhone,
  maskSpanishPhoneInput,
  normalizeSpanishPhone,
} from "./phone";

describe("isValidSpanishPhone", () => {
  it("accepts bare 9-digit mobile", () => {
    expect(isValidSpanishPhone("612345678")).toBe(true);
  });

  it("accepts +34 prefix with spaces", () => {
    expect(isValidSpanishPhone("+34 612 345 678")).toBe(true);
  });

  it("accepts +34 prefix without spaces", () => {
    expect(isValidSpanishPhone("+34612345678")).toBe(true);
  });

  it("accepts 0034 international prefix", () => {
    expect(isValidSpanishPhone("0034 612 345 678")).toBe(true);
  });

  it("accepts dashes as separators", () => {
    expect(isValidSpanishPhone("612-345-678")).toBe(true);
  });

  it("accepts landline (starts with 9)", () => {
    expect(isValidSpanishPhone("+34 912 345 678")).toBe(true);
  });

  it("rejects numbers starting with 1–5 (not Spanish)", () => {
    expect(isValidSpanishPhone("+34 512 345 678")).toBe(false);
    expect(isValidSpanishPhone("212345678")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidSpanishPhone("61234567")).toBe(false); // 8 digits
    expect(isValidSpanishPhone("6123456789")).toBe(false); // 10 digits
  });

  it("rejects letters", () => {
    expect(isValidSpanishPhone("61234567a")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidSpanishPhone("")).toBe(false);
  });
});

describe("normalizeSpanishPhone", () => {
  it("returns +34<national> for bare input", () => {
    expect(normalizeSpanishPhone("612345678")).toBe("+34612345678");
  });

  it("strips spaces", () => {
    expect(normalizeSpanishPhone("+34 612 345 678")).toBe("+34612345678");
  });

  it("strips dashes", () => {
    expect(normalizeSpanishPhone("612-345-678")).toBe("+34612345678");
  });

  it("handles 0034 prefix", () => {
    expect(normalizeSpanishPhone("0034 612 345 678")).toBe("+34612345678");
  });

  it("returns null for invalid input", () => {
    expect(normalizeSpanishPhone("abc")).toBeNull();
    expect(normalizeSpanishPhone("+1 555 123 4567")).toBeNull();
  });

  it("is idempotent on already-canonical input", () => {
    const canonical = "+34612345678";
    expect(normalizeSpanishPhone(canonical)).toBe(canonical);
  });
});

describe("formatSpanishPhone", () => {
  it("renders display form from bare 9 digits", () => {
    expect(formatSpanishPhone("612345678")).toBe("+34 612 345 678");
  });

  it("renders display form from +34 canonical", () => {
    expect(formatSpanishPhone("+34612345678")).toBe("+34 612 345 678");
  });

  it("renders landline display form", () => {
    expect(formatSpanishPhone("934567890")).toBe("+34 934 567 890");
  });

  it("returns null for invalid input", () => {
    expect(formatSpanishPhone("abc")).toBeNull();
  });
});

describe("maskSpanishPhoneInput", () => {
  it("returns short input unchanged", () => {
    expect(maskSpanishPhoneInput("6")).toBe("6");
    expect(maskSpanishPhoneInput("612")).toBe("612");
  });

  it("inserts a space after 3 digits", () => {
    expect(maskSpanishPhoneInput("6123")).toBe("612 3");
  });

  it("inserts a second space after 6 digits", () => {
    expect(maskSpanishPhoneInput("6123456")).toBe("612 345 6");
  });

  it("renders the full mask at 9 digits", () => {
    expect(maskSpanishPhoneInput("612345678")).toBe("612 345 678");
  });

  it("caps at 9 digits (ignores extra input)", () => {
    expect(maskSpanishPhoneInput("6123456789999")).toBe("612 345 678");
  });

  it("strips non-digits as the user types", () => {
    expect(maskSpanishPhoneInput("612-345-678")).toBe("612 345 678");
  });

  it("drops a pasted +34 / 34 prefix so the mask reflects the national part", () => {
    expect(maskSpanishPhoneInput("+34612345678")).toBe("612 345 678");
    expect(maskSpanishPhoneInput("34612345678")).toBe("612 345 678");
  });
});
