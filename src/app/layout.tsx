import type { Metadata } from "next";
import { Inter, Prosto_One } from "next/font/google";

import "./globals.css";

const prostoOne = Prosto_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-prosto-one",
  display: "swap",
});

/**
 * Body font: Using Inter as a fallback until Graphik font files are provided.
 * To use Graphik: replace this with next/font/local pointing to
 * src/fonts/Graphik-{Regular,Medium,Semibold,Bold}.woff2
 */
const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-graphik",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Laveina — Smart Parcel Delivery",
    template: "%s | Laveina",
  },
  description:
    "Shop-to-shop parcel delivery platform. Book, track, and manage shipments across partner pickup points.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${prostoOne.variable} ${bodyFont.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
