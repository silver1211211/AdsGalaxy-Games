import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CircleDollarSign, ClipboardCheck, Gamepad2, Users } from "lucide-react";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { getTenantAdminDashboard } from "@/features/tenant-admin/dashboard";

function money(value: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value)); }
export default async function TenantAdminDashboard({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params, auth = await requireTenantAdminPage(tenantSlug);
  const data = await getTenantAdminDashboard(auth.miniAppId), base = `/${tenantSlug}/admin`;
  const metrics = [
    ["Active users", data.users.activeToday.toLocaleString(), `${data.users.total.toLocaleString()} total`, Users],
    ["Available balance", money(data.wallet.available), `${money(data.wallet.held)} held`, CircleDollarSign],
    ["Game rewards", money(data.rewards.games), `${data.rewards.gameClaims} claims`, Gamepad2],
    ["Task rewards", money(data.rewards.tasks), `${data.taskPending} need review`, ClipboardCheck]
  ] as const;
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">Operations overview</p><h1 className="mt-1 text-3xl font-black">Dashboard</h1><p className="mt-2 text-sm text-warm-500">Live activity and financial overview.</p></div><Link href={`${base}/settings`} className="game-secondary">Manage settings</Link></div>
    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label,value,note,Icon])=><article key={label} className="rounded-3xl border border-white bg-white p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-xs font-bold text-warm-500">{label}</p><Icon size={18} className="text-teal-600"/></div><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-warm-400">{note}</p></article>)}</section>
    {(data.withdrawals.pending > 0 || data.taskPending > 0) && <section className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl bg-amber-50 p-5 text-amber-950"><AlertTriangle size={20}/><p className="flex-1 text-sm font-bold">{data.withdrawals.pending} withdrawals ({money(data.withdrawals.amount)}) and {data.taskPending} task attempts need attention.</p><Link href={`${base}/wallet/withdrawals`} className="text-xs font-black">Review queue →</Link></section>}
    <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="rounded-3xl bg-white p-5 shadow-card"><div className="flex justify-between"><h2 className="font-black">Recent administrative activity</h2><Link href={`${base}/settings/audit-log`} className="text-xs font-bold text-teal-700">Full audit log</Link></div><div className="mt-4 divide-y divide-warm-100">{data.recentAudit.length ? data.recentAudit.map(item=><div key={item.id} className="flex gap-3 py-3"><div className="mt-1 h-2 w-2 rounded-full bg-teal-500"/><div><p className="text-sm font-bold">{item.action.replaceAll("_"," ")}</p><p className="text-xs text-warm-400">{item.actor?.username ?? item.actor?.firstName ?? "Public applicant"} · {item.createdAt.toLocaleString()}</p></div></div>) : <p className="py-8 text-center text-sm text-warm-400">No administrative activity yet.</p>}</div></div>
    <div className="rounded-3xl bg-ink p-5 text-white shadow-card"><p className="text-xs font-bold uppercase tracking-wider text-teal-300">Quick access</p><div className="mt-4 grid gap-2">{[["Users","/users"],["Games","/games"],["Tasks","/tasks"],["Wallet","/wallet"],["General settings","/settings"]].map(([label,path])=><Link key={path} href={`${base}${path}`} className="flex min-h-11 items-center justify-between rounded-2xl bg-white/10 px-4 text-sm font-bold">{label}<ArrowUpRight size={15}/></Link>)}</div></div></section>
  </>;
}
