"use client";

import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useTelegram } from "@/components/providers/telegram-provider";
import { tenantLaunchDecision } from "@/features/tenant-admin/tenant-launch-state";

export function TenantLaunchPanel({
  tenantSlug,
  launchUrl,
}: {
  tenantSlug: string;
  launchUrl: string | null;
}) {
  const telegram = useTelegram();
  const decision = tenantLaunchDecision({
    providerPhase: telegram.providerPhase,
    botConfigured: Boolean(launchUrl),
  });

  if (decision === "UNRESOLVED")
    return <p className="mt-6 min-h-12 text-sm text-white/70" role="status">Checking secure launch environment…</p>;
  if (decision === "AUTHENTICATING")
    return <p className="mt-6 flex items-center gap-2 rounded-xl bg-white/10 p-4 text-sm font-bold"><LoaderCircle className="animate-spin" size={18}/>Authenticating this Telegram Mini App securely…</p>;
  if (decision === "AUTHENTICATED")
    return <div className="mt-6 flex flex-wrap gap-3"><Link href="/games" className="game-primary">Enter protected features</Link></div>;
  if (decision === "LOCAL_DEVELOPMENT")
    return <div className="mt-6"><p className="text-xs font-black uppercase tracking-wider text-teal-200">Local development preview</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/games" className="game-primary">Games</Link><Link href="/tasks" className="game-secondary">Tasks</Link><Link href="/wallet" className="game-secondary">Wallet</Link><Link href="/profile" className="game-secondary">Profile</Link></div></div>;
  if (decision === "LOCAL_DEVELOPMENT_REQUIRED")
    return <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm"><p className="font-bold">Local tenant access requires an approved development session.</p><Link href={`/dev/access?next=/${encodeURIComponent(tenantSlug)}`} className="game-secondary mt-3">Open local development access</Link></div>;
  if (decision === "FAILED")
    return <div className="mt-6 rounded-xl bg-coral-500/20 p-4 text-sm"><p className="font-bold">{telegram.authenticationError ?? "Telegram authentication failed for this Mini App."}</p><button type="button" onClick={telegram.retryAuthentication} className="game-secondary mt-3"><RefreshCw size={16}/>Retry authentication</button></div>;
  if (decision === "MISMATCH")
    return <div className="mt-6 rounded-xl bg-coral-500/20 p-4 text-sm"><p className="font-bold">{telegram.authenticationError ?? "This Telegram session belongs to a different Mini App."}</p><button type="button" onClick={telegram.retryAuthentication} className="game-secondary mt-3"><RefreshCw size={16}/>Retry for this Mini App</button></div>;
  if (decision === "BROWSER_CONFIGURED" && launchUrl)
    return <a href={launchUrl} className="game-primary mt-6">Open in Telegram</a>;
  return <p className="mt-6 rounded-xl bg-white/10 p-4 text-sm font-bold">Telegram access has not yet been configured for this Mini App.</p>;
}
