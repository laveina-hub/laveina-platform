import QRCode from "qrcode";

import { createAdminClient } from "@/lib/supabase/admin";

const QR_BUCKET = "qr-codes";

// Signed URL expiry in seconds. 7 days is generous — QR is only needed at
// drop-off/pickup moments, and the customer can always view it again from
// their dashboard (which re-generates a fresh signed URL on each load).
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Generates a QR code as a base64 data URL.
 * Used for preview/display before the shipment is saved.
 */
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

/**
 * Generates a QR code PNG and uploads it to Supabase Storage (private bucket).
 * Returns the storage file path (e.g. "LAV-12345678.png"), NOT a URL.
 * Use createQrSignedUrl() to get a time-limited URL for display.
 *
 * Called by the Stripe webhook handler after a shipment is created.
 */
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

  // Return the path, not a URL — caller stores path in DB
  return filePath;
}

/**
 * Creates a signed URL for a QR code stored in the private bucket.
 * Call this when serving the QR to the client (API routes, server components).
 */
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
