import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { OfflineBanner } from "@/components/system/offline-banner";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Ads Galaxy", template: "%s · Ads Galaxy" },
  description: "Play quick games, build streaks, and earn rewards.",
  applicationName: "Ads Galaxy",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#faf9f7"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <TelegramProvider>
          <OfflineBanner />
          {children}
        </TelegramProvider>
      </body>
    </html>
  );
}
