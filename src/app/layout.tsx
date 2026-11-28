import type { Metadata } from "next";
import { Great_Vibes } from "next/font/google";
import "./globals.css";

const logoFont = Great_Vibes({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--font-logo", display: "swap" });

export const metadata: Metadata = {
  title: "PolaGift",
  description: "Internal Operations Management Platform — Business A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${logoFont.variable} min-h-screen font-sans antialiased`}>{children}</body>
    </html>
  );
}
