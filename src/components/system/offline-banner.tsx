"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-xs font-bold text-white shadow-float">
      <WifiOff size={15} /> You&apos;re offline. Some features may be unavailable.
    </div>
  );
}
