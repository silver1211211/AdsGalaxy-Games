"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type TelegramUser = { id?: number; firstName: string; lastName?: string; username?: string; avatar?: string };
export type DashboardData = {
  user: TelegramUser;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  points: number;
  wallet: { available: string; pending: string; lifetime: string };
  completedGames: number;
  highScore: number;
  unlockedLevels: number;
  bestStars: number;
  ads: { configured: boolean; miniAppId: string | null; environment: string | null };
};
type TelegramContextValue = {
  user: TelegramUser;
  isTelegram: boolean;
  ready: boolean;
  authenticated: boolean;
  dashboard: DashboardData | null;
  refreshDashboard(): Promise<void>;
};
const TelegramContext = createContext<TelegramContextValue | null>(null);
const fallbackUser = { firstName: "Player" };

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TelegramUser>(fallbackUser);
  const [isTelegram, setIsTelegram] = useState(false);
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const refreshDashboard = useCallback(async () => {
    const response = await fetch("/api/me/dashboard", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as DashboardData;
    setDashboard(data);
    setUser(data.user);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const webApp = (window as Window & {
        Telegram?: { WebApp?: {
          ready(): void; expand(): void; initData?: string;
          initDataUnsafe?: { user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } };
        } }
      }).Telegram?.WebApp;
      webApp?.ready();
      webApp?.expand();
      const raw = webApp?.initDataUnsafe?.user;
      if (active) {
        setIsTelegram(Boolean(webApp && raw));
        if (raw) setUser({ id: raw.id, firstName: raw.first_name, lastName: raw.last_name, username: raw.username, avatar: raw.photo_url });
      }
      let response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok && webApp?.initData) {
        response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: webApp.initData })
        });
      }
      if (active && response.ok) {
        setAuthenticated(true);
        await refreshDashboard();
      } else if (active) {
        const preview = await fetch("/api/dev/preview/context", { cache: "no-store" });
        if (preview.ok) {
          const context = await preview.json() as { dashboard: DashboardData };
          setAuthenticated(true);
          setDashboard(context.dashboard);
          setUser(context.dashboard.user);
        }
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [refreshDashboard]);

  const value = useMemo(() => ({ user, isTelegram, ready, authenticated, dashboard, refreshDashboard }),
    [user, isTelegram, ready, authenticated, dashboard, refreshDashboard]);
  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram() {
  const value = useContext(TelegramContext);
  if (!value) throw new Error("useTelegram must be used within TelegramProvider");
  return value;
}
