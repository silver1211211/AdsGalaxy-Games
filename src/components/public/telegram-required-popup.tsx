import { PlatformPopup } from "@/components/system/platform-popup";

export function TelegramRequiredPopup() {
  return (
    <PlatformPopup
      title="Open through Telegram"
      message="To request your free Telegram Mini App, open an existing Ads Galaxy Mini App through Telegram. Your verified Telegram identity is required to protect requests and prevent duplicate applications."
      primary={{
        label: "Open Ads Galaxy on Telegram",
        href: process.env.NEXT_PUBLIC_ADS_GALAXY_TELEGRAM_URL ?? "https://t.me/AdsGalaxyBot?startapp",
      }}
      secondary={{ label: "Return Home", href: "/" }}
    />
  );
}
