import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { getLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: { default: "DNI — Company DNA Intelligence", template: "%s · DNI" },
  description: "Sistem pengetahuan dan intelijen perusahaan PT Takai Seiki Indonesia (prototipe).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f5f2",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
