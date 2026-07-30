"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { miniAppSlugForPath } from "@/features/tenant-admin/tenant-launch";

type TelegramUser = {
  id?: number;
  firstName: string;
  lastName?: string;
  username?: string;
  avatar?: string;
};
export type DashboardData = {
  user: TelegramUser;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  points: number;
  wallet: { available: string; pending: string; lifetime: string };
  completedGames: number;
  highScore: number;
  unlockedLevels: number;
  bestStars: number;
  ads: {
    configured: boolean;
    miniAppId: string | null;
    environment: string | null;
  };
};
type TelegramContextValue = {
  user: TelegramUser;
  isTelegram: boolean;
  telegramSdkPresent: boolean;
  signedInitDataPresent: boolean;
  ready: boolean;
  authenticated: boolean;
  authenticationStatus: "DETECTING" | "BROWSER" | "AUTHENTICATING" | "AUTHENTICATED" | "FAILED";
  authenticationError: string | null;
  currentTenantSlug: string | null;
  dashboard: DashboardData | null;
  retryAuthentication(): void;
  refreshDashboard(): Promise<void>;
};
const TelegramContext = createContext<TelegramContextValue | null>(null);
const fallbackUser = { firstName: "Player" };

export function TelegramProvider({
  children,
  platformMiniAppSlug,
}: {
  children: React.ReactNode;
  platformMiniAppSlug: string;
}) {
  const [user, setUser] = useState<TelegramUser>(fallbackUser);
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramSdkPresent, setTelegramSdkPresent] = useState(false);
  const [signedInitDataPresent, setSignedInitDataPresent] = useState(false);
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticationStatus, setAuthenticationStatus] = useState<TelegramContextValue["authenticationStatus"]>("DETECTING");
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);
  const [currentTenantSlug, setCurrentTenantSlug] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const refreshDashboard = useCallback(async () => {
    const response = await fetch("/api/me/dashboard", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as DashboardData;
    setDashboard(data);
    setUser(data.user);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const webApp = (
        window as Window & {
          Telegram?: {
            WebApp?: {
              ready(): void;
              expand(): void;
              initData?: string;
              initDataUnsafe?: {
                user?: {
                  id: number;
                  first_name: string;
                  last_name?: string;
                  username?: string;
                  photo_url?: string;
                };
              };
            };
          };
        }
      ).Telegram?.WebApp;
      webApp?.ready();
      webApp?.expand();
      const signedInitData = webApp?.initData;
      const hasSignedInitData = Boolean(signedInitData);
      const raw = webApp?.initDataUnsafe?.user;
      const routeSlug = miniAppSlugForPath(window.location.pathname, platformMiniAppSlug);
      if (active) {
        setTelegramSdkPresent(Boolean(webApp));
        setSignedInitDataPresent(hasSignedInitData);
        setIsTelegram(hasSignedInitData);
        setCurrentTenantSlug(routeSlug);
        setAuthenticationError(null);
        setAuthenticationStatus(hasSignedInitData ? "AUTHENTICATING" : "BROWSER");
        if (raw)
          setUser({
            id: raw.id,
            firstName: raw.first_name,
            lastName: raw.last_name,
            username: raw.username,
            avatar: raw.photo_url,
          });
      }
      const launchSlug = routeSlug;
      let response = await fetch("/api/auth/session", { cache: "no-store" });
      let sessionMatchesLaunch = false;
      if (response.ok) {
        const current = (await response.clone().json()) as {
          miniApp?: { slug?: string };
        };
        sessionMatchesLaunch = current.miniApp?.slug === launchSlug;
      }
      if ((!response.ok || !sessionMatchesLaunch) && hasSignedInitData) {
        response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            initData: signedInitData,
            miniAppSlug: launchSlug,
          }),
        });
        sessionMatchesLaunch = response.ok;
      }
      if (active && response.ok && sessionMatchesLaunch) {
        setAuthenticated(true);
        setAuthenticationStatus("AUTHENTICATED");
        await refreshDashboard();
      } else if (active) {
        const preview = await fetch("/api/dev/preview/context", {
          cache: "no-store",
        });
        if (preview.ok) {
          const context = (await preview.json()) as {
            dashboard: DashboardData;
          };
          setAuthenticated(true);
          setDashboard(context.dashboard);
          setUser(context.dashboard.user);
          setAuthenticationStatus("AUTHENTICATED");
        } else if (hasSignedInitData) {
          setAuthenticated(false);
          setAuthenticationStatus("FAILED");
          setAuthenticationError("Telegram authentication could not be completed for this Mini App.");
        } else {
          setAuthenticationStatus("BROWSER");
        }
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [platformMiniAppSlug, refreshDashboard, retryNonce]);

  const value = useMemo(
    () => ({
      user,
      isTelegram,
      telegramSdkPresent,
      signedInitDataPresent,
      ready,
      authenticated,
      authenticationStatus,
      authenticationError,
      currentTenantSlug,
      dashboard,
      retryAuthentication: () => {
        setReady(false);
        setAuthenticationStatus("DETECTING");
        setAuthenticationError(null);
        setRetryNonce((value) => value + 1);
      },
      refreshDashboard,
    }),
    [user, isTelegram, telegramSdkPresent, signedInitDataPresent, ready, authenticated, authenticationStatus, authenticationError, currentTenantSlug, dashboard, refreshDashboard],
  );
  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const value = useContext(TelegramContext);
  if (!value)
    throw new Error("useTelegram must be used within TelegramProvider");
  return value;
}
