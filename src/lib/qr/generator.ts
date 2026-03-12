import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL (base64-encoded PNG) for a given tracking ID.
 *
 * The QR code encodes the tracking ID as plain text, which can be scanned
 * by the pickup point app to look up the shipment.
 *
 * @param trackingId - The shipment tracking ID to encode
 * @returns A data URL string (e.g. "data:image/png;base64,...")
 */
export async function generateQrCode(trackingId: string): Promise<string> {
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
