import { env } from "@/env";

// Thin wrapper over Resend's REST API — mirrors `src/lib/gallabox/client.ts`
// so transactional email sending stays SDK-free and consistent with the rest
// of the integration layer. Auth emails go through Supabase's custom-SMTP
// (also Resend); this client is for app-triggered emails only.

const RESEND_API_URL = "https://api.resend.com/emails";

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

export type ResendSendInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

export type ResendResponse = {
  id: string;
};

export type ResendConfig = {
  apiKey: string;
  fromEmail: string;
};

/**
 * Returns `null` when Resend isn't configured — callers can fall back to a
 * dev-mode noop. Throws only if the env is half-configured (API key but no
 * from-address, or vice versa) since that's almost certainly a deploy bug.
 */
export function getResendConfig(): ResendConfig | null {
  const apiKey = env.RESEND_API_KEY;
  const fromEmail = env.RESEND_FROM_EMAIL;

  if (!apiKey && !fromEmail) return null;
  if (!apiKey || !fromEmail) {
    throw new Error(
      "Resend is partially configured — set both RESEND_API_KEY and RESEND_FROM_EMAIL."
    );
  }
  return { apiKey, fromEmail };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function sendResendEmail(input: ResendSendInput): Promise<ResendResponse> {
  const config = getResendConfig();
  if (!config) {
    throw new Error("Resend is not configured");
  }

  if (!input.html && !input.text) {
    throw new Error("Resend email must include either html or text body");
  }

  const payload: Record<string, unknown> = {
    from: config.fromEmail,
    to: [input.to],
    subject: input.subject,
  };
  if (input.html) payload.html = input.html;
  if (input.text) payload.text = input.text;
  if (input.replyTo) payload.reply_to = input.replyTo;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await delay(backoff);
    }

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // SAFETY: Resend's 200 response is documented as { id: string }
        return (await response.json()) as ResendResponse;
      }

      const errorBody = await response.text();
      lastError = new Error(`Resend API error (${response.status}): ${errorBody}`);

      if (!isRetryable(response.status)) break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Resend request failed");
    }
  }

  throw lastError ?? new Error("Resend request failed after retries");
}
