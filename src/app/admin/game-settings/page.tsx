import Link from "next/link";
import { redirect } from "next/navigation";
import { BrainCircuit, CircleHelp, LockKeyhole, MousePointerClick } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function GameSettingsPage() {
  try { await requireAdmin(); } catch { redirect("/games"); }
  const games = [
    { title: "Memory Match", description: "Levels, rewards, safety limits and Ads Galaxy.", href: "/admin/game-settings/memory-match", icon: BrainCircuit, enabled: true },
    { title: "Quiz Challenge", description: "Modes, timing, scoring, question sources and ad breaks.", href: "/admin/game-settings/quiz-challenge", icon: CircleHelp, enabled: true },
    { title: "Catch Rush", description: "Tenant-funded Coin and verified Money reward values.", href: "/admin/game-settings/tap-collector", icon: MousePointerClick, enabled: true }
  ];
  return <AppShell><main><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-600">Administration</p><h1 className="mt-1 text-3xl font-extrabold">Game Settings</h1><p className="mt-2 text-sm text-warm-600">Configuration is isolated to your Mini App.</p><div className="mt-7 grid gap-4 md:grid-cols-3">{games.map(({ title, description, href, icon: Icon, enabled }) => enabled ? <Link key={title} href={href} className="rounded-4xl bg-white p-6 shadow-card transition hover:-translate-y-1"><Icon className="text-teal-600" size={30} /><h2 className="mt-5 text-xl font-extrabold">{title}</h2><p className="mt-2 text-sm text-warm-600">{description}</p><span className="mt-5 block text-xs font-extrabold text-teal-700">Configure →</span></Link> : <section key={title} className="rounded-4xl bg-white p-6 opacity-70 shadow-card"><Icon className="text-warm-400" size={30} /><h2 className="mt-5 text-xl font-extrabold">{title}</h2><p className="mt-2 text-sm text-warm-600">{description}</p><span className="mt-5 flex items-center gap-1 text-xs font-extrabold text-warm-400"><LockKeyhole size={13} />Coming Soon</span></section>)}</div></main></AppShell>;
}
