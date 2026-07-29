"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Settings2, Target, UserRound, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/components/providers/telegram-provider";

const nav = [
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/wallet", label: "Wallet", icon: WalletCards },
  { href: "/tasks", label: "Tasks", icon: Target },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function BottomNav() {
  const pathname = usePathname();
  const { dashboard } = useTelegram();
  const items = dashboard?.role === "ADMIN" || dashboard?.role === "SUPER_ADMIN"
    ? [...nav, { href: "/admin", label: "Admin", icon: Settings2 }] : nav;
  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-50 px-3 safe-bottom">
      <div className="mx-auto flex max-w-[560px] items-center justify-around rounded-[1.7rem] border border-white/80 bg-white/90 p-2 shadow-[0_16px_48px_rgba(20,32,30,.18)] backdrop-blur-xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("relative flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-2xl px-3 text-[11px] font-bold transition-all",
                active ? "bg-teal-50 text-teal-700" : "text-warm-400 hover:bg-warm-50 hover:text-ink")}>
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
              {active && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-teal-500" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
