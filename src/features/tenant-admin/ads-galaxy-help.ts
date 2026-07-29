export const ADS_GALAXY_BOT_URL = "https://t.me/Ads_Galaxy_Bot";

export const ADS_GALAXY_HELP_STEPS = [
  {
    title: "Open the Ads Galaxy Bot",
    text: "Open the official Ads Galaxy Telegram bot and create or access your Ads Galaxy account.",
  },
  {
    title: "Add Your Mini App",
    text: "Inside Ads Galaxy, add a new Mini App and enter the required information for the Mini App you manage. Use the real Mini App URL shown below.",
  },
  {
    title: "Submit for Approval",
    text: "Complete the required Ads Galaxy setup and submit the Mini App for approval. Ads may not be available until the Mini App has been reviewed and approved by Ads Galaxy.",
  },
  {
    title: "Copy Your Mini App ID",
    text: "After the Mini App is created, Ads Galaxy provides a numeric Mini App ID. Copy that ID from Ads Galaxy. The ID should contain numbers only.",
  },
  {
    title: "Save the ID",
    text: "Return to this Admin page, paste the numeric ID into the Ads Galaxy Mini App ID field, and select Save ID. One shared Ads Galaxy Mini App ID is used by Memory Match, Quiz Challenge, and Tap Collector.",
  },
  {
    title: "How Earnings Work",
    text: "After the integration is active, eligible Ads Galaxy ads can be displayed through the Mini App. Earnings are recorded according to Ads Galaxy campaign availability, verified activity, traffic quality, and the active reward policy.",
  },
] as const;

export function openAdsGalaxyBot(target: {
  Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } };
  open: (url: string, target: string, features: string) => unknown;
}) {
  const url = new URL(ADS_GALAXY_BOT_URL);
  if (url.protocol !== "https:" || url.hostname !== "t.me")
    throw new Error("Invalid Ads Galaxy bot URL");
  const telegramOpen = target.Telegram?.WebApp?.openTelegramLink;
  if (telegramOpen) {
    telegramOpen(url.toString());
    return "telegram" as const;
  }
  target.open(url.toString(), "_blank", "noopener,noreferrer");
  return "browser" as const;
}
