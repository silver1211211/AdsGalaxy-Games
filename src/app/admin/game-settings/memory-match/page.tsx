import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { MemoryMatchSettingsForm } from "@/components/admin/memory-match-settings-form";

export default async function MemoryMatchSettingsPage() {
  try { await requireAdmin(); } catch { redirect("/games"); }
  return <main className="mx-auto min-h-dvh w-full max-w-[980px] px-4 pb-16 pt-5 sm:px-7"><Link href="/admin/game-settings" className="game-icon-button" aria-label="Back to game settings"><ArrowLeft size={18} /></Link><div className="my-6"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-600">Game Settings</p><h1 className="mt-1 text-3xl font-extrabold">Memory Match</h1><p className="mt-2 text-sm text-warm-600">Tenant-scoped gameplay, reward, safety and advertising controls.</p></div><MemoryMatchSettingsForm /></main>;
}
