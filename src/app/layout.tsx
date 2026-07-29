import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { OfflineBanner } from "@/components/system/offline-banner";
import { DevelopmentSessionBanner } from "@/components/dev/development-session-banner";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: { default: "Ads Galaxy", template: "%s · Ads Galaxy" },
  description:
    "Request and manage a Telegram Mini App with games, tasks, Wallet tools and platform-controlled rewards.",
  applicationName: "Ads Galaxy",
  manifest: "/manifest.webmanifest",
  openGraph: {
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Launch Your Own Telegram Mini App with Ads Galaxy",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf9f7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <TelegramProvider
          platformMiniAppSlug={
            process.env.PLATFORM_MINI_APP_SLUG ?? "ads-galaxy"
          }
        >
          <OfflineBanner />
          <DevelopmentSessionBanner />
          {children}
        </TelegramProvider>
      </body>
    </html>
  );
}
