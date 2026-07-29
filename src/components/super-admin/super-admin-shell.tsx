"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BadgeDollarSign, Building2, ClipboardList, Gamepad2, LayoutDashboard, Megaphone, Menu, Moon, Plug, Settings, ShieldCheck, Sun, UserCog, Users, X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { superAdminSectionActive, type SuperAdminTheme } from "@/features/super-admin/policy";
import { ContextHelp, SUPER_ADMIN_HELP, type HelpContent } from "./context-help";

const items = [
  ["/super-admin", "Overview", LayoutDashboard],
  ["/super-admin/tenants", "Tenants", Building2],
  ["/super-admin/mini-app-requests", "Mini App Requests", ClipboardList],
  ["/super-admin/administrators", "Administrators", UserCog],
  ["/super-admin/users", "Users", Users],
  ["/super-admin/games", "Games", Gamepad2],
  ["/super-admin/sponsored-content", "Sponsored Content", Megaphone],
  ["/super-admin/finance", "Finance", BadgeDollarSign],
  ["/super-admin/integrations", "Integrations", Plug],
  ["/super-admin/settings", "Platform Settings", Settings],
] as const;

export function SuperAdminShell({ children, initialTheme, accountName }: {
  children: React.ReactNode; initialTheme: SuperAdminTheme; accountName: string;
}) {
  const pathname = usePathname(), router = useRouter();
  const [theme, setTheme] = useState(initialTheme), [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  async function changeTheme(next: SuperAdminTheme) {
    setTheme(next);
    await fetch("/api/super-admin/preferences", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    });
    router.refresh();
  }
  async function logout() {
    await fetch("/api/profile/logout", { method: "POST" });
    location.assign("/dev/access?next=/super-admin");
  }
  const helpKey=pathname.startsWith("/super-admin/tenants")?"tenants":pathname.startsWith("/super-admin/administrators")?"administrators":pathname.startsWith("/super-admin/users")?"users":pathname.startsWith("/super-admin/games")?"games":pathname.startsWith("/super-admin/sponsored-content")?"sponsored":pathname.startsWith("/super-admin/finance")?"finance":pathname.startsWith("/super-admin/integrations")?"integrations":pathname.startsWith("/super-admin/settings")?"settings":"overview";
  const pageHelp=SUPER_ADMIN_HELP[helpKey as keyof typeof SUPER_ADMIN_HELP] as HelpContent;
  const navigation = <nav aria-label="Super Admin sections" className="mt-8 grid gap-1">
    {items.map(([href, label, Icon]) => {
      const active = superAdminSectionActive(pathname, href);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined}
        className={`sa-nav-item ${active ? "sa-nav-item-active" : ""}`}>
        <Icon size={18}/><span>{label}</span>
      </Link>;
    })}
  </nav>;
  return <div className="sa-root" data-sa-theme={theme.toLowerCase()}>
    <aside className="sa-sidebar">
      <div className="flex items-center gap-3"><span className="sa-logo"><ShieldCheck size={22}/></span>
        <div><p className="font-black">Ads Galaxy</p><p className="sa-muted text-[10px] font-bold uppercase tracking-[.16em]">Super Admin</p></div>
      </div>
      {navigation}
      <div className="mt-auto grid gap-3">
        <ThemeSwitch theme={theme} onChange={changeTheme}/>
        <div className="sa-account"><span className="truncate text-xs font-bold">{accountName}</span>
          <button type="button" onClick={() => void logout()} aria-label="Logout"><LogOut size={16}/></button>
        </div>
      </div>
    </aside>
    {open && <button className="sa-drawer-backdrop" aria-label="Close menu" onClick={() => setOpen(false)}/>}
    <aside className={`sa-drawer ${open ? "sa-drawer-open" : ""}`}>
      <div className="flex items-center justify-between"><strong>Super Admin</strong><button className="sa-icon" onClick={() => setOpen(false)}><X/></button></div>
      {navigation}<div className="mt-auto"><ThemeSwitch theme={theme} onChange={changeTheme}/></div>
    </aside>
    <div className="sa-content">
      <header className="sa-header"><button className="sa-icon lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu/></button>
        <div className="min-w-0"><p className="truncate text-sm font-black">{accountName}</p><p className="sa-muted text-[10px] uppercase tracking-wider">Global platform workspace</p></div>
        <ContextHelp content={pageHelp}/>
        <div className="ml-auto hidden sm:block"><ThemeSwitch theme={theme} onChange={changeTheme} compact/></div>
      </header>
      <main className="sa-main">{children}</main>
    </div>
  </div>;
}

function ThemeSwitch({ theme, onChange, compact = false }: { theme: SuperAdminTheme; onChange(theme: SuperAdminTheme): void; compact?: boolean }) {
  return <div className={`sa-theme-switch ${compact ? "sa-theme-compact" : ""}`} aria-label="Appearance">
    <button type="button" aria-pressed={theme === "LIGHT"} onClick={() => onChange("LIGHT")}><Sun size={15}/>{!compact && "Light"}</button>
    <button type="button" aria-pressed={theme === "DARK"} onClick={() => onChange("DARK")}><Moon size={15}/>{!compact && "Dark"}</button>
  </div>;
}
