import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Laveina",
    template: "%s | Laveina",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
