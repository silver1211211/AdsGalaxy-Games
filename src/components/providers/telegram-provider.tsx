"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type TelegramUser = {
  id?: number;
  firstName: string;
  lastName?: string;
  username?: string;
  avatar?: string;
};

type TelegramContextValue = { user: TelegramUser; isTelegram: boolean; ready: boolean };
const TelegramContext = createContext<TelegramContextValue | null>(null);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TelegramContextValue>({
    user: { firstName: "John" }, isTelegram: false, ready: false
  });

  useEffect(() => {
    const webApp = (window as Window & {
      Telegram?: { WebApp?: { ready(): void; expand(): void; colorScheme?: string; initDataUnsafe?: {
        user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string }
      }}}
    }).Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
    const raw = webApp?.initDataUnsafe?.user;
    setState({
      isTelegram: Boolean(webApp && raw),
      ready: true,
      user: raw ? {
        id: raw.id, firstName: raw.first_name, lastName: raw.last_name,
        username: raw.username, avatar: raw.photo_url
      } : { firstName: "John" }
    });
  }, []);

  const value = useMemo(() => state, [state]);
  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram() {
  const value = useContext(TelegramContext);
  if (!value) throw new Error("useTelegram must be used within TelegramProvider");
  return value;
}
