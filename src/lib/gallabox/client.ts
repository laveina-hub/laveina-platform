import { GALLABOX_MAX_RETRIES, GALLABOX_RETRY_BASE_DELAY_MS } from "@/constants/notifications";
import { env } from "@/env";

type TemplateParam = {
  name: string;
  value: string;
};

type GallaboxMessagePayload = {
  channelId: string;
  recipient: {
    phone: string;
  };
  whatsapp: {
    type: "template";
    template: {
      templateName: string;
      bodyValues: Record<string, string>;
    };
  };
};

export type GallaboxResponse = {
  id: string;
  status: string;
  message?: string;
};

function getConfig() {
  if (!env.GALLABOX_API_KEY || !env.GALLABOX_API_URL || !env.GALLABOX_CHANNEL_ID) {
    throw new Error("Gallabox credentials are not configured");
  }
  return {
    apiKey: env.GALLABOX_API_KEY,
    apiUrl: env.GALLABOX_API_URL,
    channelId: env.GALLABOX_CHANNEL_ID,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * DEV-ONLY stub — when `GALLABOX_STUB=true` in the environment, we skip the
 * real API call entirely and return a synthetic success response. This is the
 * first stage of the local testing strategy:
 *
 *   Stage 1 (GALLABOX_STUB=true)        — no real WhatsApp traffic; payloads
 *                                          are console-logged for inspection.
 *                                          Safe to use with fake/Spanish test
 *                                          numbers; no Meta template approval
 *                                          required.
 *   Stage 2 (GALLABOX_STUB=false + your own WhatsApp number) — real API call,
 *                                          real delivery to a device you own.
 *                                          Requires approved Meta templates
 *                                          and a relaxed phone validator (see
 *                                          `shipment.schema.ts` dev-mode gate).
 *   Stage 3 (production)                 — real API call to real Spanish
 *                                          customer numbers.
 *
 * The stub still returns the same `GallaboxResponse` shape so downstream code
 * (notification.service.ts → notifications_log inserts) runs unchanged. The
 * synthetic `id` is prefixed with `stub:` so it's easy to spot in the DB.
 */
function isStubEnabled(): boolean {
  return process.env.GALLABOX_STUB === "true";
}

function stubSend(to: string, templateName: string, params: TemplateParam[]): GallaboxResponse {
  // Verbose log so developers can verify the exact payload that would have
  // been sent — template name, recipient, and numbered body values mirror
  // what Gallabox renders into the WhatsApp template variables.
  console.log("[Gallabox STUB] Skipping real send. Payload:", {
    to,
    templateName,
    params: params.reduce<Record<string, string>>((acc, p, i) => {
      acc[`{{${i + 1}}} ${p.name}`] = p.value;
      return acc;
    }, {}),
  });
  return {
    id: `stub:${templateName}:${Date.now()}`,
    status: "sent",
    message: "Stubbed in dev — no real WhatsApp delivery occurred.",
  };
}

export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  params: TemplateParam[]
): Promise<GallaboxResponse> {
  // Dev short-circuit — see `isStubEnabled` docs above. Checked BEFORE
  // `getConfig()` so the stub works even without Gallabox credentials set,
  // which is the common local-dev case.
  if (isStubEnabled()) {
    return stubSend(to, templateName, params);
  }

  const { apiKey, apiUrl, channelId } = getConfig();

  const bodyValues: Record<string, string> = {};
  params.forEach((param, index) => {
    bodyValues[String(index + 1)] = param.value;
  });

  const payload: GallaboxMessagePayload = {
    channelId,
    recipient: {
      phone: to,
    },
    whatsapp: {
      type: "template",
      template: {
        templateName,
        bodyValues,
      },
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= GALLABOX_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = GALLABOX_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await delay(backoff);
    }

    try {
      const response = await fetch(`${apiUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // SAFETY: Gallabox API response shape matches GallaboxResponse (id, status, message)
        return response.json() as Promise<GallaboxResponse>;
      }

      const errorBody = await response.text();
      lastError = new Error(`Gallabox API error (${response.status}): ${errorBody}`);

      if (!isRetryable(response.status)) {
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Gallabox request failed");
    }
  }

  throw lastError ?? new Error("Gallabox request failed after retries");
}
