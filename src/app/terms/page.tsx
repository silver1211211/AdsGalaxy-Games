import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function TermsPage() {
  const settings = await prisma.platformConfiguration.findUnique({
    where: { id: "platform" },
    select: { termsUrl: true },
  });
  return <main className="mx-auto min-h-dvh max-w-3xl px-4 py-10"><h1 className="text-4xl font-black">Platform Terms</h1><p className="mt-5 leading-7 text-warm-600">Mini App requests, approvals, advertising availability, rewards and continued tenant operation remain subject to Ads Galaxy platform review and applicable policies.</p>{settings?.termsUrl&&<a className="game-primary mt-6" href={settings.termsUrl} rel="noreferrer">Read the complete Terms</a>}<Link className="game-secondary mt-3" href="/request-mini-app">Return to request form</Link></main>;
}
