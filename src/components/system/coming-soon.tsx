import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

export function ComingSoon({ title, description = "This space is being prepared for a future update." }: { title: string; description?: string }) {
  return (
    <AppShell>
      <main className="grid min-h-[72dvh] place-items-center">
        <section className="w-full max-w-lg rounded-4xl border border-white bg-white p-8 text-center shadow-card sm:p-12">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-teal-50 text-teal-600"><Construction size={34} /></div>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[.18em] text-coral-500">Coming soon</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-warm-600">{description}</p>
          <Link href="/games" className="mx-auto mt-7 flex min-h-12 w-fit items-center gap-2 rounded-2xl bg-ink px-5 text-sm font-extrabold text-white transition hover:bg-teal-700 active:scale-95"><ArrowLeft size={17} />Back to games</Link>
        </section>
      </main>
    </AppShell>
  );
}
