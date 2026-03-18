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

type GallaboxResponse = {
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

  const response = await fetch(`${apiUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gallabox API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<GallaboxResponse>;
}
