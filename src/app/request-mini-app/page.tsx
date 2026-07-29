import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { MiniAppRequestForm } from "@/components/public/mini-app-request-form";
import { TelegramRequiredPopup } from "@/components/public/telegram-required-popup";
export const metadata: Metadata = { title: "Request Your Mini App", description: "Apply for a managed Telegram Mini App.", robots: { index: true, follow: true } };
export default async function RequestMiniAppPage(){const session=await getSession();if(!session||session.source==="DEVELOPMENT")return <main className="min-h-dvh"><TelegramRequiredPopup/></main>;return <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6"><Link href="/" className="game-icon-button"><ArrowLeft/></Link><header className="py-10"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">Partner application</p><h1 className="mt-2 text-4xl font-black">Request Your Mini App</h1><p className="mt-3 max-w-2xl leading-7 text-warm-600">Complete this request to apply for your own managed Telegram Mini App. Your request will be reviewed before a tenant is created.</p></header><MiniAppRequestForm authenticated applicantName={`${session.user.firstName} ${session.user.lastName??""}`.trim()} username={session.user.username}/><p className="mt-6 text-center text-sm"><Link href="/request-mini-app/status" className="font-bold text-teal-700">Already applied? Check request status</Link></p></main>}
