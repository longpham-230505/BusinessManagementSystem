import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABMS",
  description: "Internal Operations Management Platform — Business A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}