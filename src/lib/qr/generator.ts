import QRCode from "qrcode";

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
