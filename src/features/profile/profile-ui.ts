export const PROFILE_ACCOUNT_ITEMS = [
  { href: "/profile/edit", label: "Edit Profile" },
  { href: "/profile/preferences", label: "Preferences and Notifications" }
] as const;

export const PROFILE_PREFERENCE_GROUPS = [
  {
    title: "Notifications",
    items: [
      { key: "walletRewardsNotifications", label: "Wallet Rewards", description: "Get notified when a wallet reward, point conversion, or withdrawal status changes." },
      { key: "taskUpdatesNotifications", label: "Task Updates", description: "Get notified about task progress, reviews, approvals, and new available tasks." },
      { key: "announcementsNotifications", label: "Announcements", description: "Receive important platform and Mini App announcements." }
    ]
  },
  {
    title: "Game Experience",
    items: [
      { key: "soundEnabled", label: "Sound", description: "Enable game sound effects." }
    ]
  }
] as const;

export type PublicPreferenceKey = typeof PROFILE_PREFERENCE_GROUPS[number]["items"][number]["key"];
