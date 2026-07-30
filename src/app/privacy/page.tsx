import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PrivacyPage() {
  const settings = await prisma.platformConfiguration.findUnique({
    where: { id: "platform" },
    select: { privacyUrl: true },
  });
  return <main className="mx-auto min-h-dvh max-w-3xl px-4 py-10"><h1 className="text-4xl font-black">Privacy Policy</h1><p className="mt-5 leading-7 text-warm-600">Ads Galaxy uses a secure first-party device identifier to enforce free-request limits. Only a keyed server-side hash is stored with the request; the raw identifier and raw IP address are not stored in request records.</p>{settings?.privacyUrl&&<a className="game-primary mt-6" href={settings.privacyUrl} rel="noreferrer">Read the complete Privacy Policy</a>}<Link className="game-secondary mt-3" href="/request-mini-app">Return to request form</Link></main>;
}
