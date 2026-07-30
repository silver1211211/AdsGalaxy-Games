import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Bot, Gamepad2, ListChecks, Megaphone,
  ShieldCheck, Users, WalletCards,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Request and Launch Your Mini App | Ads Galaxy",
  description: "Apply on the web for a managed Mini App with games, tasks, wallet tools, tenant administration and optional tenant-specific Telegram integration.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Build Your Community Mini App with Ads Galaxy",
    description: "A website-first application and managed Mini App platform for communities, creators and businesses.",
    type: "website",
  },
};

const features = [
  [Gamepad2, "Games", "Offer a growing catalog of platform-controlled games with tenant reward settings, scoring and safety controls."],
  [ListChecks, "Tasks", "Create engagement tasks with supported verification, review and reward controls."],
  [WalletCards, "Wallet", "Provide points, supported conversions, balances, transaction history and managed withdrawal tools."],
  [Users, "Tenant management", "Manage users, games, tasks, rewards, announcements, maintenance and tenant settings from a dedicated dashboard."],
  [Bot, "Optional Telegram integration", "Launch first as a website, then connect your own tenant bot when you are ready to authenticate Telegram Mini App users."],
  [Megaphone, "Ads Galaxy configuration", "Configure eligible Ads Galaxy and sponsored-content experiences. Campaign and ad availability are never guaranteed."],
  [ShieldCheck, "Platform safeguards", "Tenant isolation, encrypted credentials, signed sessions, immutable financial records and platform-wide safety limits."],
] as const;

const steps = [
  ["Submit your request", "Apply through the public website. Your name is required; a Telegram username is optional. One active free request is permitted per device."],
  ["Review and assignment", "A Super Admin reviews the application. If approved, a verified Administrator identity is assigned."],
  ["Secure Administrator setup", "Use the separate Administrator login URL and replace the temporary password at first login."],
  ["Launch the website", "Your public Mini App URL can operate as a website before a Telegram bot is connected."],
  ["Connect Telegram when ready", "Configure your own tenant bot. Its Mini App launch link uses t.me/{tenantBotUsername}?startapp={tenantSlug}."],
] as const;

const faq = [
  ["Do I need Telegram to apply?", "No. The application form is public and works in a normal browser. A Telegram username is optional."],
  ["Is approval automatic?", "No. Ads Galaxy reviews each application, and submission does not guarantee approval."],
  ["Can my Mini App launch before I configure a bot?", "Yes. The public website can launch first. Telegram authentication becomes available after the tenant Administrator securely configures and validates that tenant’s bot."],
  ["Which Administrator URL should I use?", "Sign in through /{tenantSlug}/admin/login. After authentication, use /{tenantSlug}/admin as the protected dashboard."],
  ["Are ads or earnings guaranteed?", "No. Availability and rewards depend on eligible campaigns, verified activity, traffic quality and current provider rules."],
] as const;

export default function Home() {
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
  return <main className="public-site min-h-dvh overflow-x-hidden bg-[#faf9f7] text-[#14201e]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson).replaceAll("<", "\\u003c") }} />
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
      <Link href="/" className="flex items-center gap-2 font-black"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-600 text-white"><BadgeCheck /></span>Ads Galaxy</Link>
      <div className="flex items-center gap-2"><Link href="/request-mini-app/status" className="hidden px-3 py-2 text-sm font-bold sm:block">Request Status</Link><Link href="/request-mini-app" className="rounded-xl bg-teal-700 px-4 py-3 text-sm font-black text-white">Request a Mini App</Link></div>
    </nav>

    <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pt-24">
      <div><p className="text-xs font-black uppercase tracking-[.22em] text-teal-700">Website-first Mini App applications</p><h1 className="mt-4 max-w-3xl text-balance text-5xl font-black leading-[1.02] sm:text-6xl">Apply for Your Community Mini App</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-warm-600">Request a managed Mini App with games, tasks, wallet tools, tenant administration and optional Telegram integration. Apply from any modern browser—Telegram is not required to begin.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/request-mini-app" className="game-primary min-h-14 px-6 text-base">Request a Mini App <ArrowRight size={18}/></Link><Link href="/request-mini-app/status" className="game-secondary min-h-14 px-6 text-base">Check Request Status</Link></div><p className="mt-5 text-sm font-bold text-warm-500">One active free request is allowed per device. Every request is reviewed, and approval is not guaranteed.</p></div>
      <div className="relative rounded-[2rem] border border-white bg-white p-6 shadow-float"><div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-100 blur-2xl"/><p className="text-xs font-black uppercase text-coral-500">One managed platform · your tenant</p><div className="mt-5 grid gap-3">{["Public Mini App website","Separate Administrator login","Protected Administrator dashboard","Optional tenant-specific Telegram bot"].map((item, index)=><div key={item} className="flex items-center gap-3 rounded-2xl bg-warm-50 p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-100 font-black text-teal-700">{index+1}</span><strong className="text-sm">{item}</strong></div>)}</div></div>
    </section>

    <section id="features" className="bg-white py-20"><div className="mx-auto max-w-6xl px-4"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">Platform features</p><h2 className="mt-2 text-3xl font-black">Tools to operate and grow a Mini App</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(([Icon,title,body])=><article key={title} className="rounded-3xl bg-warm-50 p-5"><Icon className="text-teal-700"/><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-warm-600">{body}</p></article>)}</div></div></section>

    <section id="how" className="py-20"><div className="mx-auto max-w-6xl px-4"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">How it works</p><h2 className="mt-2 text-3xl font-black">From website request to tenant launch</h2><div className="mt-8 grid gap-4 md:grid-cols-5">{steps.map(([title,body],index)=><article key={title} className="rounded-3xl bg-white p-5 shadow-card"><span className="text-3xl font-black text-teal-200">0{index+1}</span><h3 className="mt-3 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-warm-600">{body}</p></article>)}</div></div></section>

    <section className="bg-[#14201e] py-20 text-white"><div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-2"><article><p className="text-xs font-black uppercase tracking-[.2em] text-teal-300">Administrator access</p><h2 className="mt-2 text-3xl font-black">Separate login and dashboard addresses</h2><p className="mt-4 text-sm leading-7 text-white/70">Approved tenants receive a public URL, an Administrator login URL ending in <code>/admin/login</code>, and a protected dashboard URL ending in <code>/admin</code>. A temporary password must be replaced during first login.</p></article><article className="rounded-3xl bg-white/8 p-6"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-300">Telegram integration</p><h2 className="mt-2 text-2xl font-black">Connect your own bot later</h2><p className="mt-3 text-sm leading-7 text-white/70">Telegram is optional during application and website launch. Each tenant configures its own encrypted bot token. Telegram Mini App authentication uses only that tenant’s validated bot—never a platform-wide fallback token.</p></article></div></section>

    <section className="py-20"><div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2"><article><h2 className="text-3xl font-black">Tenant responsibilities</h2><ul className="mt-5 grid gap-2 text-sm leading-6 text-warm-600"><li>• Provide accurate application and promotion information.</li><li>• Secure Administrator credentials and configure only your own bot.</li><li>• Manage tenant games, tasks, supported rewards, wallet settings and advertisements within platform limits.</li><li>• Bring genuine users and avoid fraudulent or automated traffic.</li></ul></article><article><h2 className="text-3xl font-black">Platform responsibilities</h2><ul className="mt-5 grid gap-2 text-sm leading-6 text-warm-600"><li>• Review requests and provision approved tenants.</li><li>• Enforce tenant isolation, authentication and reward safeguards.</li><li>• Maintain shared mechanics, ledgers and emergency controls.</li><li>• Protect encrypted tenant credentials and sensitive configuration.</li></ul></article></div></section>

    <section className="bg-white py-20"><div className="mx-auto max-w-6xl px-4"><h2 className="text-3xl font-black">Eligibility and activity</h2><p className="mt-4 max-w-3xl leading-7 text-warm-600">Community owners, creators, businesses and partners with an existing audience or credible promotion plan may apply. Applicant name, tenant details and a genuine promotion plan are required; Telegram username is optional. Approved tenants are expected to remain active and may be paused under the platform activity policy.</p></div></section>

    <section className="py-20"><div className="mx-auto max-w-4xl px-4"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">FAQ</p><h2 className="mt-2 text-3xl font-black">Common questions</h2><div className="mt-8 grid gap-3">{faq.map(([question,answer])=><details key={question} className="rounded-2xl bg-white p-5 shadow-card"><summary className="cursor-pointer font-black">{question}</summary><p className="mt-3 text-sm leading-6 text-warm-600">{answer}</p></details>)}</div></div></section>

    <section className="mx-auto max-w-6xl px-4 pb-20"><div className="rounded-[2rem] bg-teal-700 p-8 text-white sm:p-12"><h2 className="text-3xl font-black">Ready to submit your request?</h2><p className="mt-3 text-teal-50">Tell us about your Mini App, intended audience and genuine promotion plan.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/request-mini-app" className="rounded-xl bg-white px-5 py-4 text-center font-black text-teal-800">Request a Mini App</Link><Link href="/request-mini-app/status" className="rounded-xl border border-white/30 px-5 py-4 text-center font-black">Check Request Status</Link></div></div></section>

    <footer className="border-t bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between"><strong>Ads Galaxy Platform</strong><div className="flex flex-wrap gap-4"><Link href="/request-mini-app">Request Mini App</Link><Link href="/request-mini-app/status">Request Status</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div><span className="text-warm-400">© {new Date().getFullYear()} Ads Galaxy</span></div></footer>
  </main>;
}
