import QRCode from "qrcode";

import { createAdminClient } from "@/lib/supabase/admin";

const QR_BUCKET = "qr-codes";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function generateQrDataUrl(trackingId: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(trackingId, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return dataUrl;
}

/** Generates QR PNG and uploads to the private bucket. */
export async function generateAndUploadQrCode(trackingId: string): Promise<string> {
  const buffer = await QRCode.toBuffer(trackingId, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  const supabase = createAdminClient();
  const filePath = `${trackingId}.png`;

  const { error } = await supabase.storage.from(QR_BUCKET).upload(filePath, buffer, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    throw new Error(`QR upload failed for ${trackingId}: ${error.message}`);
  }

  return filePath;
}

export async function createQrSignedUrl(filePath: string): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(QR_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data) {
    throw new Error(`QR signed URL failed for ${filePath}: ${error?.message}`);
  }

  return data.signedUrl;
}
