import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RequestDetailLoader } from "@/components/public/request-detail-loader";

export const metadata: Metadata = { title: "Request Details", robots: { index: false, follow: false } };

export default async function Detail({ params }: { params: Promise<{ publicReference: string }> }) {
  const { publicReference } = await params;
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6">
      <Link href="/request-mini-app/status" className="game-icon-button"><ArrowLeft /></Link>
      <div className="mt-8"><RequestDetailLoader publicReference={publicReference} /></div>
    </main>
  );
}
