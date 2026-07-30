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
import {
  detectTelegramRuntime,
  emptyTelegramRuntimeSnapshot,
  type TelegramRuntimeDiagnostics,
  type TelegramRuntimeSnapshot,
} from "@/features/tenant-admin/telegram-runtime";

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
type ProviderPhase = TelegramRuntimeDiagnostics["providerPhase"];
type TelegramContextValue = {
  user: TelegramUser;
  isTelegram: boolean;
  telegramSdkPresent: boolean;
  signedInitDataPresent: boolean;
  ready: boolean;
  authenticated: boolean;
  providerPhase: ProviderPhase;
  authenticationError: string | null;
  currentTenantSlug: string | null;
  authenticatedTenantSlug: string | null;
  diagnostics: TelegramRuntimeDiagnostics;
  dashboard: DashboardData | null;
  retryAuthentication(): void;
  refreshDashboard(): Promise<void>;
};
type TelegramWebApp = {
  ready(): void;
  expand(): void;
  initData?: string;
  initDataUnsafe?: {
    start_param?: string;
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  onEvent?(event: "viewportChanged" | "themeChanged", callback: () => void): void;
  offEvent?(event: "viewportChanged" | "themeChanged", callback: () => void): void;
};

const TelegramContext = createContext<TelegramContextValue | null>(null);
const fallbackUser = { firstName: "Player" };
const initialSnapshot = emptyTelegramRuntimeSnapshot();
const initialDiagnostics: TelegramRuntimeDiagnostics = {
  sdkDetected: false,
  webAppDetected: false,
  signedInitDataPresent: false,
  initDataLength: 0,
  startParamPresent: false,
  routeTenantSlug: "",
  providerPhase: "UNRESOLVED",
  authenticationAttempted: false,
  authenticatedTenantSlug: null,
  authenticationErrorCode: null,
};

function telegramWindow() {
  return window as Window & { Telegram?: { WebApp?: TelegramWebApp } };
}

function inspectTelegramRuntime(): TelegramRuntimeSnapshot {
  const sdk = telegramWindow().Telegram;
  const webApp = sdk?.WebApp;
  const initData = webApp?.initData ?? "";
  return {
    sdkDetected: Boolean(sdk),
    webAppDetected: Boolean(webApp),
    signedInitDataPresent: initData.length > 0,
    initDataLength: initData.length,
    startParamPresent: Boolean(webApp?.initDataUnsafe?.start_param),
    initData,
  };
}

export function TelegramProvider({
  children,
  platformMiniAppSlug,
}: {
  children: React.ReactNode;
  platformMiniAppSlug: string;
}) {
  const [user, setUser] = useState<TelegramUser>(fallbackUser);
  const [runtime, setRuntime] = useState(initialSnapshot);
  const [providerPhase, setProviderPhase] =
    useState<ProviderPhase>("UNRESOLVED");
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticationError, setAuthenticationError] =
    useState<string | null>(null);
  const [currentTenantSlug, setCurrentTenantSlug] = useState<string | null>(
    null,
  );
  const [authenticatedTenantSlug, setAuthenticatedTenantSlug] = useState<
    string | null
  >(null);
  const [authenticationAttempted, setAuthenticationAttempted] = useState(false);
  const [authenticationErrorCode, setAuthenticationErrorCode] = useState<
    string | null
  >(null);
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
    let readyCalled = false;
    let lifecycleWebApp: TelegramWebApp | undefined;
    let detectionResolved = false;
    let lateInitDataHandled = false;
    const pendingTimers = new Map<
      ReturnType<typeof setTimeout>,
      () => void
    >();
    const routeSlug = miniAppSlugForPath(
      window.location.pathname,
      platformMiniAppSlug,
    );
    const localTenantFeatureRoute =
      /^\/(?:games|tasks|wallet|profile)(?:\/|$)/.test(
        window.location.pathname,
      );
    setCurrentTenantSlug(routeSlug);
    setProviderPhase("UNRESOLVED");
    setAuthenticationError(null);
    setAuthenticationErrorCode(null);
    setAuthenticationAttempted(false);
    setAuthenticated(false);
    setAuthenticatedTenantSlug(null);

    const inspect = () => {
      const snapshot = inspectTelegramRuntime();
      const webApp = telegramWindow().Telegram?.WebApp;
      if (webApp && !readyCalled) {
        webApp.ready();
        webApp.expand();
        readyCalled = true;
      }
      if (webApp && lifecycleWebApp !== webApp) {
        lifecycleWebApp?.offEvent?.("viewportChanged", lifecycleCheck);
        lifecycleWebApp?.offEvent?.("themeChanged", lifecycleCheck);
        webApp.onEvent?.("viewportChanged", lifecycleCheck);
        webApp.onEvent?.("themeChanged", lifecycleCheck);
        lifecycleWebApp = webApp;
      }
      if (active) setRuntime(snapshot);
      return snapshot;
    };
    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          pendingTimers.delete(timer);
          resolve();
        }, milliseconds);
        pendingTimers.set(timer, resolve);
      });
    const lifecycleCheck = () => {
      if (!active) return;
      const snapshot = inspect();
      if (
        detectionResolved &&
        snapshot.signedInitDataPresent &&
        !lateInitDataHandled
      ) {
        lateInitDataHandled = true;
        setRetryNonce((value) => value + 1);
      }
    };
    window.addEventListener("focus", lifecycleCheck);
    window.addEventListener("pageshow", lifecycleCheck);
    document.addEventListener("visibilitychange", lifecycleCheck);
    void (async () => {
      let sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      let sessionTenantSlug: string | null = null;
      let localDevelopmentSession = false;
      if (sessionResponse.ok) {
        const session = (await sessionResponse.json().catch(() => null)) as {
          localDevelopment?: boolean;
          miniApp?: { slug?: string };
        } | null;
        sessionTenantSlug = session?.miniApp?.slug ?? null;
        localDevelopmentSession = session?.localDevelopment === true;
      }
      if (
        localDevelopmentSession &&
        sessionTenantSlug &&
        (sessionTenantSlug === routeSlug || localTenantFeatureRoute)
      ) {
        setCurrentTenantSlug(sessionTenantSlug);
        setAuthenticated(true);
        setAuthenticatedTenantSlug(sessionTenantSlug);
        setProviderPhase("LOCAL_DEVELOPMENT_AUTHENTICATED");
        await refreshDashboard();
        return;
      }

      const detected = await detectTelegramRuntime({ inspect, wait });
      if (!active) return;
      detectionResolved = true;
      lateInitDataHandled = detected.signedInitDataPresent;
      const webApp = telegramWindow().Telegram?.WebApp;
      const raw = webApp?.initDataUnsafe?.user;
      if (raw)
        setUser({
          id: raw.id,
          firstName: raw.first_name,
          lastName: raw.last_name,
          username: raw.username,
          avatar: raw.photo_url,
        });

      if (!detected.signedInitDataPresent) {
        if (!active) return;
        if (sessionResponse.ok && sessionTenantSlug === routeSlug) {
          setAuthenticated(true);
          setAuthenticatedTenantSlug(routeSlug);
          await refreshDashboard();
        } else {
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
          }
        }
        if (active) {
          const developmentStatus = await fetch("/api/dev/auth/status", {
            cache: "no-store",
          }).catch(() => null);
          setProviderPhase(
            developmentStatus?.ok
              ? "LOCAL_DEVELOPMENT_REQUIRED"
              : "BROWSER",
          );
        }
        return;
      }

      if (sessionTenantSlug === routeSlug) {
        setAuthenticated(true);
        setAuthenticatedTenantSlug(routeSlug);
        setProviderPhase("TELEGRAM_AUTHENTICATED");
        await refreshDashboard();
        return;
      }
      if (sessionTenantSlug && sessionTenantSlug !== routeSlug)
        setProviderPhase("TENANT_MISMATCH");
      else setProviderPhase("TELEGRAM_AUTHENTICATING");

      setAuthenticationAttempted(true);
      const authResponse = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData: detected.initData,
          miniAppSlug: routeSlug,
        }),
      });
      if (!active) return;
      if (!authResponse.ok) {
        setProviderPhase("TELEGRAM_FAILED");
        setAuthenticationError(
          "Telegram authentication could not be completed.",
        );
        setAuthenticationErrorCode(`AUTH_HTTP_${authResponse.status}`);
        return;
      }
      const authenticatedResponse = (await authResponse
        .json()
        .catch(() => null)) as { miniApp?: { slug?: string } } | null;
      if (authenticatedResponse?.miniApp?.slug !== routeSlug) {
        setProviderPhase("TENANT_MISMATCH");
        setAuthenticationError(
          "Telegram authentication returned a different Mini App tenant.",
        );
        setAuthenticationErrorCode("AUTH_TENANT_MISMATCH");
        return;
      }

      sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const verifiedSession = sessionResponse.ok
        ? ((await sessionResponse.json().catch(() => null)) as {
            miniApp?: { slug?: string };
          } | null)
        : null;
      if (verifiedSession?.miniApp?.slug !== routeSlug) {
        setProviderPhase("TENANT_MISMATCH");
        setAuthenticationError(
          "The authenticated session does not match this Mini App.",
        );
        setAuthenticationErrorCode("SESSION_TENANT_MISMATCH");
        return;
      }
      setAuthenticated(true);
      setAuthenticatedTenantSlug(routeSlug);
      setProviderPhase("TELEGRAM_AUTHENTICATED");
      await refreshDashboard();
    })().catch(() => {
      if (!active) return;
      setProviderPhase("TELEGRAM_FAILED");
      setAuthenticationError("Telegram authentication could not be completed.");
      setAuthenticationErrorCode("AUTH_RUNTIME_ERROR");
    });

    return () => {
      active = false;
      for (const [timer, resolve] of pendingTimers) {
        clearTimeout(timer);
        resolve();
      }
      pendingTimers.clear();
      window.removeEventListener("focus", lifecycleCheck);
      window.removeEventListener("pageshow", lifecycleCheck);
      document.removeEventListener("visibilitychange", lifecycleCheck);
      lifecycleWebApp?.offEvent?.("viewportChanged", lifecycleCheck);
      lifecycleWebApp?.offEvent?.("themeChanged", lifecycleCheck);
    };
  }, [platformMiniAppSlug, refreshDashboard, retryNonce]);

  const diagnostics = useMemo<TelegramRuntimeDiagnostics>(
    () => ({
      sdkDetected: runtime.sdkDetected,
      webAppDetected: runtime.webAppDetected,
      signedInitDataPresent: runtime.signedInitDataPresent,
      initDataLength: runtime.initDataLength,
      startParamPresent: runtime.startParamPresent,
      routeTenantSlug: currentTenantSlug ?? "",
      providerPhase,
      authenticationAttempted,
      authenticatedTenantSlug,
      authenticationErrorCode,
    }),
    [
      runtime,
      currentTenantSlug,
      providerPhase,
      authenticationAttempted,
      authenticatedTenantSlug,
      authenticationErrorCode,
    ],
  );
  const value = useMemo<TelegramContextValue>(
    () => ({
      user,
      isTelegram: runtime.signedInitDataPresent,
      telegramSdkPresent: runtime.sdkDetected,
      signedInitDataPresent: runtime.signedInitDataPresent,
      ready: providerPhase !== "UNRESOLVED",
      authenticated,
      providerPhase,
      authenticationError,
      currentTenantSlug,
      authenticatedTenantSlug,
      diagnostics,
      dashboard,
      retryAuthentication: () => setRetryNonce((value) => value + 1),
      refreshDashboard,
    }),
    [
      user,
      runtime,
      providerPhase,
      authenticated,
      authenticationError,
      currentTenantSlug,
      authenticatedTenantSlug,
      diagnostics,
      dashboard,
      refreshDashboard,
    ],
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
