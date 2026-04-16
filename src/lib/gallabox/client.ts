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

export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  params: TemplateParam[]
): Promise<GallaboxResponse> {
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
