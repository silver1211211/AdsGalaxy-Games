import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gamepad2, ListChecks, WalletCards } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isValidTenantSlug, telegramLaunchUrl } from "@/features/tenant-admin/boundary";
import { tenantPublicState } from "@/features/tenant-admin/tenant-launch";
import { TenantLaunchPanel } from "@/components/public/tenant-launch-panel";

async function tenant(slug: string) {
  if (!isValidTenantSlug(slug)) return null;
  return prisma.miniApp.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, status: true, inactivityReason: true,
      adminSettings: { select: { description: true, logoUrl: true, maintenanceMode: true, maintenanceMessage: true, startMessage: true, startImageKey: true } },
      botConfiguration: { select: { botUsername: true, validationStatus: true } },
      gameSettings: { select: { enabled: true } },
      quizSettings: { select: { enabled: true } },
      tapCollectorSettings: { select: { enabled: true } },
      mazeRunnerSettings: { select: { enabled: true } },
      taskSettings: { select: { enabled: true } },
      walletSettings: { select: { walletEnabled: true, withdrawalsEnabled: true, conversionEnabled: true } },
      adConfiguration: { select: { enabled: true, status: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ tenantSlug: string }> }): Promise<Metadata> {
  const item = await tenant((await params).tenantSlug);
  return item ? { title: item.name, description: item.adminSettings?.description ?? `Open ${item.name}` } : {};
}

export default async function TenantMiniApp({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const item = await tenant(tenantSlug);
  const state = tenantPublicState({ exists: Boolean(item), status: item?.status, maintenanceMode: item?.adminSettings?.maintenanceMode });
  if (state === "NOT_FOUND" || !item) notFound();
  if (state === "UNAVAILABLE")
    return <TenantUnavailable name={item.name} message={item.adminSettings?.maintenanceMessage} />;

  const launchUrl = item.botConfiguration?.validationStatus === "VALIDATED"
    ? telegramLaunchUrl(item.botConfiguration.botUsername, item.slug)
    : null;
  const enabledGames = [
    item.gameSettings?.enabled, item.quizSettings?.enabled,
    item.tapCollectorSettings?.enabled, item.mazeRunnerSettings?.enabled,
  ].filter(Boolean).length;

  return <main className="mx-auto min-h-dvh max-w-5xl overflow-x-hidden px-4 py-8 sm:px-7">
    <header className="rounded-[2rem] bg-ink p-7 text-white shadow-float sm:p-10">
      {item.adminSettings?.startImageKey &&
        <img src={`/api/tenants/${encodeURIComponent(item.slug)}/start-image?v=${encodeURIComponent(item.adminSettings.startImageKey)}`} alt="" className="mb-6 max-h-72 w-full rounded-3xl object-cover" />}
      {item.adminSettings?.logoUrl && <img src={item.adminSettings.logoUrl} alt="" className="mb-5 h-16 w-16 rounded-2xl object-cover" />}
      <p className="text-xs font-black uppercase tracking-[.2em] text-teal-300">Tenant Mini App</p>
      <h1 className="mt-2 text-4xl font-black sm:text-5xl">{item.name}</h1>
      <p className="mt-4 max-w-2xl leading-7 text-white/70">{item.adminSettings?.startMessage ?? item.adminSettings?.description ?? `Welcome to ${item.name}. Open securely through its configured Telegram bot to play and earn.`}</p>
      <TenantLaunchPanel tenantSlug={item.slug} launchUrl={launchUrl} />
    </header>
    <section className="mt-6 grid gap-4 sm:grid-cols-3">
      <TenantFeature icon={Gamepad2} title="Games" detail={`${enabledGames} configured game${enabledGames === 1 ? "" : "s"}`} href="/games" />
      <TenantFeature icon={ListChecks} title="Tasks" detail={item.taskSettings?.enabled ? "Engagement tasks enabled" : "Tasks currently unavailable"} href="/tasks" />
      <TenantFeature icon={WalletCards} title="Wallet" detail={item.walletSettings ? "Tenant wallet tools" : "Wallet currently unavailable"} href="/wallet" />
    </section>
    <p className="mt-8 text-center text-xs text-warm-400">Mini App path: /{item.slug} · Advertisements {item.adConfiguration?.enabled && item.adConfiguration.status === "ACTIVE" ? "enabled" : "subject to tenant configuration"}</p>
  </main>;
}

function TenantFeature({ icon: Icon, title, detail, href }: { icon: typeof Gamepad2; title: string; detail: string; href: string }) {
  return <Link href={href} className="rounded-3xl bg-white p-5 shadow-card"><Icon className="text-teal-600" /><h2 className="mt-4 text-xl font-black">{title}</h2><p className="mt-2 text-sm text-warm-500">{detail}</p></Link>;
}

function TenantUnavailable({ name, message }: { name: string; message?: string | null }) {
  return <main className="grid min-h-dvh place-items-center px-4"><section className="max-w-lg rounded-[2rem] bg-white p-7 text-center shadow-float"><p className="text-xs font-black uppercase tracking-wider text-coral-600">Mini App unavailable</p><h1 className="mt-2 text-3xl font-black">{name}</h1><p className="mt-4 leading-7 text-warm-600">{message ?? "This Mini App is temporarily unavailable. Please try again later."}</p></section></main>;
}
