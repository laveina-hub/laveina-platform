import type { Metadata } from "next";
import { Prosto_One } from "next/font/google";

import "./globals.css";

// Prosto One — display/heading font (loaded via Google Fonts)
const prostoOne = Prosto_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-prosto-one",
  display: "swap",
});

// Graphik Web — body font (licensed, Order 1609-LPRSWK)
// @font-face declarations in globals.css, files in src/fonts/graphik/

export const metadata: Metadata = {
  title: {
    default: "Laveina",
    template: "%s | Laveina",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={`${prostoOne.variable} font-body antialiased`}>{children}</body>
    </html>
  );
}
