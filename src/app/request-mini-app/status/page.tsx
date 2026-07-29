import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { RequestStatusList } from "@/components/public/request-status-list";
import { TelegramRequiredPopup } from "@/components/public/telegram-required-popup";

export const metadata: Metadata = { title: "Mini App Request Status", robots: { index: false, follow: false } };

export default async function StatusPage() {
  const session = await getSession();
  if (!session || session.source === "DEVELOPMENT")
    return <main className="min-h-dvh"><TelegramRequiredPopup /></main>;
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6">
      <Link href="/" className="game-icon-button"><ArrowLeft /></Link>
      <header className="py-10">
        <p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">Application tracking</p>
        <h1 className="mt-2 text-4xl font-black">Your Mini App Requests</h1>
        <p className="mt-3 text-warm-600">Track review progress, respond to questions and open approved Mini Apps.</p>
      </header>
      <RequestStatusList authenticated />
    </main>
  );
}
