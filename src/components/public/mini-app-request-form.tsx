"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlatformPopup } from "@/components/system/platform-popup";
import { tenantUrls } from "@/lib/tenant-urls";
import { readClientApiError } from "@/lib/client-api-error";

type Availability = { available: boolean; status: string; slug: string };
const categories = ["COMMUNITY","ENTERTAINMENT","EDUCATION","BUSINESS","CREATOR","GAMING","OTHER"];
const channels = ["TELEGRAM_CHANNEL","TELEGRAM_GROUP","TELEGRAM_BOT","TIKTOK","INSTAGRAM","YOUTUBE","X","FACEBOOK","WEBSITE","OTHER"];
const usernamePattern = /^@?[A-Za-z0-9_]{5,64}$/;
const slugPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function MiniAppRequestForm() {
  const [form, setForm] = useState({
    applicantName: "", telegramUsername: "", proposedName: "", requestedSlug: "",
    description: "", intendedAudience: "", category: "COMMUNITY",
    primaryPromotionChannel: "TELEGRAM_CHANNEL", primaryPromotionUrl: "",
    estimatedAudienceSize: 0, expectedFirstWeekUsers: 0, promotionPlan: "",
    additionalLinks: "", review: false, genuineUsers: false, inactivity: false,
    rewards: false, terms: false,
  });
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const [deviceReady, setDeviceReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const recovery = localStorage.getItem("ag_request_device");
        const response = await fetch("/api/request-device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recovery ? { recoveryIdentifier: recovery } : {}),
        });
        if (!response.ok)
          throw new Error((await readClientApiError(response, "Device verification failed.")).error);
        const body = await response.json();
        localStorage.setItem("ag_request_device", body.identifier);
        setDeviceReady(true);
      } catch {
        setPopup({ title: "Device verification failed", message: "This device could not be secured. Refresh the page and try again." });
      }
    })();
  }, []);

  const urls = useMemo(
    () => tenantUrls(form.requestedSlug || "your-path"),
    [form.requestedSlug],
  );
  const set = (key: string, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));

  async function checkSlug(value: string) {
    const slug = value.toLowerCase().replace(/\s+/g, "-");
    set("requestedSlug", slug);
    setAvailability(null);
    if (slug.length < 5 || !slugPattern.test(slug)) return;
    setChecking(true);
    try {
      const response = await fetch(`/api/mini-app-requests/availability?slug=${encodeURIComponent(slug)}`);
      setAvailability(await response.json());
    } catch {
      setPopup({ title: "Network error", message: "Path availability could not be checked." });
    } finally {
      setChecking(false);
    }
  }

  function clientValidation() {
    if (form.applicantName.trim().length < 2) return "Enter your applicant name.";
    if (form.telegramUsername && !usernamePattern.test(form.telegramUsername.trim())) return "Enter a valid Telegram username or leave it blank.";
    if (!validSlug(form.requestedSlug)) return "Enter a valid lowercase Mini App path with at least 5 characters.";
    if (!availability?.available || availability.slug !== form.requestedSlug) return "Choose a Mini App path confirmed as available.";
    if (!form.description.trim() || !form.intendedAudience.trim() || !form.promotionPlan.trim()) return "Complete all required Mini App and promotion details.";
    try {
      const promotion = new URL(form.primaryPromotionUrl);
      if (promotion.protocol !== "https:" || promotion.href === "https://t.me/") throw new Error();
      for (const link of form.additionalLinks.split(/\s+/).filter(Boolean)) if (new URL(link).protocol !== "https:") throw new Error();
    } catch {
      return "Use complete, valid HTTPS URLs.";
    }
    if (![form.review, form.genuineUsers, form.inactivity, form.rewards, form.terms].every(Boolean))
      return "Accept every platform expectation before submitting.";
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validation = clientValidation();
    if (validation) {
      setPopup({ title: "Review required fields", message: validation });
      return;
    }
    if (!deviceReady) {
      setPopup({ title: "Device verification", message: "Secure device verification is still loading." });
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      applicantName: form.applicantName.trim(),
      telegramUsername: form.telegramUsername.trim(),
      estimatedAudienceSize: Number(form.estimatedAudienceSize),
      expectedFirstWeekUsers: Number(form.expectedFirstWeekUsers),
      additionalLinks: [...new Set(form.additionalLinks.split(/\s+/).filter(Boolean))],
      acknowledgements: {
        review: form.review, genuineUsers: form.genuineUsers, inactivity: form.inactivity,
        rewards: form.rewards, terms: form.terms,
      },
      idempotencyKey: crypto.randomUUID(),
    };
    try {
      const response = await fetch("/api/mini-app-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const apiError = await readClientApiError(response, "Review the form and try again.");
        const title = response.status === 409 ? "Request already active" : response.status === 429 ? "Too many requests" : "Request could not be submitted";
        setPopup({ title, message: apiError.error });
        return;
      }
      const body = await response.json().catch(() => null) as any;
      setSubmitted(body);
    } catch {
      setPopup({ title: "Network error", message: "The request could not reach Ads Galaxy. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  const availableConfirmed = availability?.available === true && availability.slug === form.requestedSlug;
  const statusLabel = checking ? "Checking" : availability?.slug === form.requestedSlug ? (availability.available ? "Available" : "Unavailable") : "Invalid";
  return <>
    <form onSubmit={submit} className="grid min-w-0 gap-5">
      <Section title="A. Applicant identity">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Applicant name" value={form.applicantName} change={(value) => set("applicantName", value)} minLength={2} maxLength={160} required />
          <Field label="Telegram username (optional)" value={form.telegramUsername} change={(value) => set("telegramUsername", value)} maxLength={64} />
        </div>
        <Help>Each device may submit only one active free Mini App request.</Help>
      </Section>
      <Section title="B. Mini App details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Proposed Mini App name" value={form.proposedName} change={(value) => set("proposedName", value)} minLength={3} maxLength={100} required />
          <label className="grid gap-1 font-bold">Primary category<select required value={form.category} onChange={(event) => set("category", event.target.value)} className="min-h-12 rounded-xl border bg-white px-3">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <Field label="Preferred Mini App path" value={form.requestedSlug} change={(value) => void checkSlug(value)} minLength={5} maxLength={40} required />
          <div className="rounded-xl bg-warm-50 p-3"><p className={`font-black ${availability?.available ? "text-teal-700" : "text-coral-600"}`}>{statusLabel}</p><p className="mt-2 break-all text-sm"><b>Public Mini App URL:</b><br />{urls.public}</p><p className="mt-2 break-all text-sm"><b>Administrator Login URL:</b><br />{urls.administratorLogin}</p><p className="mt-2 break-all text-sm"><b>Administrator Dashboard URL:</b><br />{urls.administratorDashboard}</p></div>
          <Area label="Short description" value={form.description} change={(value) => set("description", value)} minLength={30} maxLength={500} />
          <div><Area label="Intended audience" value={form.intendedAudience} change={(value) => set("intendedAudience", value)} minLength={20} maxLength={500} /><p className="mt-2 text-xs text-warm-500">Describe the type of users or community you expect to use this Mini App.</p></div>
        </div>
        <Help>These addresses are reserved after approval. Administrators sign in through the login URL, then use the separate authenticated dashboard URL.</Help>
      </Section>
      <Section title="C. Promotion plan">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 font-bold">Primary promotion channel<select required value={form.primaryPromotionChannel} onChange={(event) => set("primaryPromotionChannel", event.target.value)} className="min-h-12 rounded-xl border bg-white px-3">{channels.map((channel) => <option key={channel}>{channel.replaceAll("_", " ")}</option>)}</select></label>
          <Field label="Social/community URL" type="url" placeholder="https://t.me/your-community" value={form.primaryPromotionUrl} change={(value) => set("primaryPromotionUrl", value)} required />
          <Field label="Current audience size" type="number" min={0} step={1} value={String(form.estimatedAudienceSize)} change={(value) => set("estimatedAudienceSize", value)} required />
          <Field label="Expected first-week users" type="number" min={0} step={1} value={String(form.expectedFirstWeekUsers)} change={(value) => set("expectedFirstWeekUsers", value)} required />
          <div className="sm:col-span-2"><Area label="Explain how you plan to bring genuine users" value={form.promotionPlan} change={(value) => set("promotionPlan", value)} minLength={100} maxLength={2000} /></div>
          <div className="sm:col-span-2"><Area label="Additional HTTPS links, separated by spaces" value={form.additionalLinks} change={(value) => set("additionalLinks", value)} /></div>
        </div>
        <Help>Fake accounts, bots and artificial traffic are not allowed. First-week users are an estimate, not a guarantee.</Help>
      </Section>
      <Section title="D. Platform expectations">
        <div className="grid gap-3">
          <Agreement checked={form.review} change={(value) => set("review", value)}>Submitting does not guarantee approval.</Agreement>
          <Agreement checked={form.genuineUsers} change={(value) => set("genuineUsers", value)}>I will use genuine users, not bots or fraudulent traffic.</Agreement>
          <Agreement checked={form.inactivity} change={(value) => set("inactivity", value)}>Inactive Mini Apps may be paused under the activity policy.</Agreement>
          <Agreement checked={form.rewards} change={(value) => set("rewards", value)}>Ad availability and rewards remain subject to verification and platform rules.</Agreement>
          <Agreement checked={form.terms} change={(value) => set("terms", value)}>I agree to the <Link href="/terms" className="font-black text-teal-700 underline">Terms</Link> and <Link href="/privacy" className="font-black text-teal-700 underline">Privacy Policy</Link>.</Agreement>
        </div>
      </Section>
      <button disabled={busy || !deviceReady || !availableConfirmed} className="game-primary min-h-14 text-base disabled:opacity-45">{busy ? "Submitting…" : deviceReady ? "Submit Request" : "Securing device…"}</button>
    </form>
    {popup && <PlatformPopup title={popup.title} message={popup.message} dismissible onClose={() => setPopup(null)} primary={{ label: "Review Form", onClick: () => setPopup(null) }} />}
    {submitted && <PlatformPopup title="Request submitted" message="Your free Mini App request has been received and will be reviewed. Save your private status link to follow its progress." primary={{ label: "View Request Status", href: submitted.protectedStatusPath }} secondary={{ label: "Return Home", href: "/" }} />}
  </>;
}

function validSlug(value: string) { return value.length >= 5 && value.length <= 40 && slugPattern.test(value); }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="min-w-0 rounded-[1.5rem] bg-white p-5 shadow-card"><h2 className="mb-4 text-xl font-black">{title}</h2>{children}</section>; }
function Field({ label, value, change, type = "text", placeholder, required, minLength, maxLength, min, step }: { label: string; value: string; change(value: string): void; type?: string; placeholder?: string; required?: boolean; minLength?: number; maxLength?: number; min?: number; step?: number }) { return <label className="grid min-w-0 gap-1 font-bold">{label}<input type={type} value={value} placeholder={placeholder} required={required} minLength={minLength} maxLength={maxLength} min={min} step={step} onChange={(event) => change(event.target.value)} className="min-h-12 min-w-0 rounded-xl border bg-white px-3" /></label>; }
function Area({ label, value, change, minLength, maxLength }: { label: string; value: string; change(value: string): void; minLength?: number; maxLength?: number }) { return <label className="grid min-w-0 gap-1 font-bold">{label}<textarea value={value} onChange={(event) => change(event.target.value)} minLength={minLength} maxLength={maxLength} required={Boolean(minLength)} rows={4} className="min-w-0 rounded-xl border px-3 py-3" /></label>; }
function Agreement({ checked, change, children }: { checked: boolean; change(value: boolean): void; children: React.ReactNode }) { return <label className="flex gap-3 rounded-xl bg-warm-50 p-3"><input type="checkbox" checked={checked} onChange={(event) => change(event.target.checked)} required className="mt-1 h-5 w-5 shrink-0 accent-teal-700" /><span>{children}</span></label>; }
function Help({ children }: { children: React.ReactNode }) { return <p className="mt-4 rounded-xl bg-teal-50 p-3 text-sm leading-6 text-teal-950">{children}</p>; }
