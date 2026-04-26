import { routing } from "@/i18n/routing";

// Shared rendering helpers for transactional emails. Lives under `lib/email`
// because services (`email.service.ts`, `email-templates.service.ts`) both
// consume them — keeping them here avoids a circular import and makes the
// pure rendering layer independently testable.

export type EmailLocale = (typeof routing.locales)[number];

export function normalizeLocale(raw?: string | null): EmailLocale {
  // SAFETY: widening the readonly locale tuple to `readonly string[]` so we
  // can call `.includes(string)` — the cast is type-widening, not narrowing.
  const allowed = routing.locales as readonly string[];
  if (raw && allowed.includes(raw)) {
    // SAFETY: narrowed by `includes()` above — raw is one of the literal locale strings.
    return raw as EmailLocale;
  }
  return routing.defaultLocale;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type DetailRow = { label: string; value: string };

// HTML composition helpers. Translation messages stay plain text (no inline
// `<br>`, `<strong>`, or `<a>` — next-intl's ICU parser rejects them as
// rich-text tags); HTML structure is assembled here from clean translated
// fragments. Inputs are escaped on the way in so callers don't have to.

/** Render a "Label: value" detail list joined by line breaks. */
export function renderDetails(rows: DetailRow[]): string {
  return rows
    .map((r) => `<strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.value)}`)
    .join("<br/>");
}

/** Render a single anchor tag with escaped href and label. */
export function renderLink(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
}

/** Join already-rendered HTML fragments with paragraph breaks (`<br/><br/>`). */
export function joinParagraphs(...parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p && p.length > 0)).join("<br/><br/>");
}

type WrapHtmlParts = {
  greeting: string;
  body: string;
  signoff: string;
  support: string;
};

/** Wraps the transactional body in email-safe inline-styled HTML. Mail clients
 *  strip `<style>` tags, so all styles are inline. */
export function wrapHtml(parts: WrapHtmlParts): string {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.55; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p style="margin: 0 0 16px;">${parts.greeting}</p>
    <p style="margin: 0 0 16px;">${parts.body}</p>
    <p style="margin: 24px 0 8px;">${parts.signoff}</p>
    <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
    <p style="margin: 0; font-size: 13px; color: #666;">${parts.support}</p>
  </body>
</html>`;
}
