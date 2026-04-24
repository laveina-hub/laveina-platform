// Spain-only. Accepts +34 / 34 / 0034 / bare 9-digit + spaces or dashes.
// Canonical: "+34612345678" (E.164). Display: "+34 612 345 678".
// Swap this module for libphonenumber-js when we go international.

const DIGIT_COUNT = 9;
const MOBILE_OR_LANDLINE_START = /^[6-9]/;

/** Strip every non-digit, collapse leading "0034" or "34" into nothing so we
 *  can always rebuild the +34 prefix from a bare 9-digit national number. */
function extractNationalDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === DIGIT_COUNT) return digits;
  if (digits.length === DIGIT_COUNT + 2 && digits.startsWith("34")) {
    return digits.slice(2);
  }
  if (digits.length === DIGIT_COUNT + 4 && digits.startsWith("0034")) {
    return digits.slice(4);
  }
  return null;
}

/** True if `raw` parses to a valid Spanish mobile or landline number. */
export function isValidSpanishPhone(raw: string): boolean {
  const national = extractNationalDigits(raw);
  if (!national) return false;
  return MOBILE_OR_LANDLINE_START.test(national);
}

/** E.164 form "+34612345678" for storage / API transport. Returns null on
 *  invalid input so callers can branch. */
export function normalizeSpanishPhone(raw: string): string | null {
  const national = extractNationalDigits(raw);
  if (!national || !MOBILE_OR_LANDLINE_START.test(national)) return null;
  return `+34${national}`;
}

/** Display form "+34 612 345 678" for UI labels. Accepts either a canonical
 *  +34… string or any of the user-input variants above. */
export function formatSpanishPhone(raw: string): string | null {
  const national = extractNationalDigits(raw);
  if (!national || !MOBILE_OR_LANDLINE_START.test(national)) return null;
  const a = national.slice(0, 3);
  const b = national.slice(3, 6);
  const c = national.slice(6, 9);
  return `+34 ${a} ${b} ${c}`;
}

/** Live-type mask for input fields. Keeps only digits (and a leading "+"),
 *  enforces the 9-digit national length, and groups as the user types. Safe
 *  to call on every keystroke. */
export function maskSpanishPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // If user pastes "+34…" or "34…", drop the country code so masking only
  // reflects the national part; the +34 prefix is rendered by formatters.
  const stripped = digits.startsWith("34") ? digits.slice(2) : digits;
  const capped = stripped.slice(0, DIGIT_COUNT);

  if (capped.length <= 3) return capped;
  if (capped.length <= 6) return `${capped.slice(0, 3)} ${capped.slice(3)}`;
  return `${capped.slice(0, 3)} ${capped.slice(3, 6)} ${capped.slice(6)}`;
}
