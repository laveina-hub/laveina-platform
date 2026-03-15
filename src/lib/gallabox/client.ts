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
  const apiKey = process.env.GALLABOX_API_KEY;
  const apiUrl = process.env.GALLABOX_API_URL;
  const channelId = process.env.GALLABOX_CHANNEL_ID;

  if (!apiKey) {
    throw new Error("Missing GALLABOX_API_KEY environment variable");
  }
  if (!apiUrl) {
    throw new Error("Missing GALLABOX_API_URL environment variable");
  }
  if (!channelId) {
    throw new Error("Missing GALLABOX_CHANNEL_ID environment variable");
  }

  return { apiKey, apiUrl, channelId };
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
