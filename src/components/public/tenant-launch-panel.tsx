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
    ready: telegram.ready,
    signedInitDataPresent: telegram.signedInitDataPresent,
    authenticationStatus: telegram.authenticationStatus,
    authenticated: telegram.authenticated,
    currentTenantSlug: telegram.currentTenantSlug,
    tenantSlug,
    botConfigured: Boolean(launchUrl),
  });

  if (decision === "DETECTING")
    return <div className="mt-6 min-h-12" aria-label="Checking launch environment" />;
  if (decision === "AUTHENTICATING")
    return <p className="mt-6 flex items-center gap-2 rounded-xl bg-white/10 p-4 text-sm font-bold"><LoaderCircle className="animate-spin" size={18}/>Authenticating this Telegram Mini App securely…</p>;
  if (decision === "AUTHENTICATED")
    return <div className="mt-6 flex flex-wrap gap-3"><Link href="/games" className="game-primary">Enter protected features</Link></div>;
  if (decision === "FAILED")
    return <div className="mt-6 rounded-xl bg-coral-500/20 p-4 text-sm"><p className="font-bold">{telegram.authenticationError ?? "Telegram authentication failed for this Mini App."}</p><button type="button" onClick={telegram.retryAuthentication} className="game-secondary mt-3"><RefreshCw size={16}/>Retry authentication</button></div>;
  if (decision === "BROWSER_CONFIGURED" && launchUrl)
    return <a href={launchUrl} className="game-primary mt-6">Open in Telegram</a>;
  return <p className="mt-6 rounded-xl bg-white/10 p-4 text-sm font-bold">Telegram access has not yet been configured for this Mini App.</p>;
}
