"use client";

import { Check, Copy, HelpCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ADS_GALAXY_BOT_URL,
  ADS_GALAXY_HELP_STEPS,
  openAdsGalaxyBot,
} from "@/features/tenant-admin/ads-galaxy-help";

export function AdsGalaxyIdForm({
  tenantSlug,
  miniAppUrl,
}: {
  tenantSlug: string;
  miniAppUrl: string;
}) {
  const [id, setId] = useState("");
  const [invalidInput, setInvalidInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<{
    configured: boolean;
    maskedMiniAppId?: string | null;
  } | null>(null);
  const [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const endpoint = `/api/${tenantSlug}/admin/ads-galaxy`;

  useEffect(() => {
    fetch(endpoint)
      .then((response) => response.json())
      .then(setState);
  }, [endpoint]);

  function openHelp() {
    dialogRef.current?.showModal();
  }

  function closeHelp() {
    dialogRef.current?.close();
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(miniAppUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function save() {
    const value = id.trim();
    if (invalidInput || !/^\d{3,32}$/.test(value)) {
      setMessage("Enter a valid numeric Ads Galaxy Mini App ID.");
      return;
    }
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ miniAppId: value }),
    });
    const body = await response.json();
    if (response.ok) {
      setState(body);
      setId("");
      setInvalidInput(false);
    }
    setMessage(
      response.ok
        ? "Ads Galaxy Mini App ID saved."
        : "Enter a valid numeric Ads Galaxy Mini App ID.",
    );
  }

  return (
    <section className="relative mt-6 rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-black">Ads Galaxy Mini App ID</h2>
          <p className="mt-1 text-xs leading-5 text-warm-500">
            One shared numeric Ads Galaxy ID is used by all games in this Mini
            App.
          </p>
        </div>
        <button
          ref={helpButtonRef}
          type="button"
          onClick={openHelp}
          aria-label="How to get your Ads Galaxy Mini App ID"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-800 ring-offset-2 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <HelpCircle aria-hidden="true" size={21} />
        </button>
      </div>

      {state?.configured && (
        <p className="mt-3 text-sm font-black text-teal-700">
          Configured · {state.maskedMiniAppId}
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-warm-500">
        Don&apos;t have an ID? Tap the question-mark guide to create and approve
        your Mini App through Ads Galaxy.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={32}
          value={id}
          onChange={(event) => {
            const raw = event.target.value;
            setInvalidInput(/[^\d\s]/.test(raw));
            setId(raw.replace(/\D/g, ""));
          }}
          placeholder="Enter numeric Mini App ID"
          aria-label="Ads Galaxy numeric Mini App ID"
          className="min-h-11 min-w-0 flex-1 rounded-xl border px-3"
        />
        <button
          type="button"
          disabled={!id}
          onClick={() => void save()}
          className="game-primary disabled:opacity-50"
        >
          Save ID
        </button>
      </div>
      <p aria-live="polite" className="mt-2 text-xs font-bold text-teal-700">
        {message}
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby="ads-galaxy-help-title"
        onClose={() => helpButtonRef.current?.focus()}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100%-1rem))] overflow-y-auto rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/60"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-warm-100 bg-white p-5">
          <div>
            <h2 id="ads-galaxy-help-title" className="text-xl font-black">
              How to Get Your Ads Galaxy Mini App ID
            </h2>
            <p className="mt-2 text-xs leading-5 text-warm-500">
              Ads Galaxy displays sponsored ads inside your Mini App. You earn
              from eligible ad activity generated through your Mini App, while
              Ads Galaxy handles ad delivery and tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={closeHelp}
            aria-label="Close Ads Galaxy help"
            className="game-icon-button shrink-0 focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          <p className="rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-950">
            Earnings may depend on available campaigns, verified ad activity,
            advertiser demand, traffic quality, and the current Ads Galaxy
            reward rules.
          </p>
          {ADS_GALAXY_HELP_STEPS.map((step, index) => (
            <section
              key={step.title}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-2xl bg-warm-50 p-4"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-600 text-xs font-black text-white">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-black">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-warm-600">
                  {step.text}
                </p>
                {index === 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      openAdsGalaxyBot(
                        window as Parameters<typeof openAdsGalaxyBot>[0],
                      )
                    }
                    className="game-secondary mt-3"
                  >
                    Open Ads Galaxy Bot
                  </button>
                )}
                {index === 1 && (
                  <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
                    <input
                      readOnly
                      value={miniAppUrl}
                      aria-label="Current tenant Mini App URL"
                      className="min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void copyUrl()}
                      className="game-secondary shrink-0"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
                {index === 3 && (
                  <code className="mt-2 inline-block rounded-lg bg-white px-2 py-1 text-xs">
                    123456
                  </code>
                )}
                {index === 5 && (
                  <div className="mt-3 grid gap-2 text-xs leading-5">
                    <p className="font-bold text-coral-700">
                      Ads Galaxy advertising is part of this platform and cannot
                      be disabled by the tenant Admin.
                    </p>
                    <p>
                      Saving an ID does not by itself guarantee that ads are
                      immediately available. The Mini App may still require
                      approval, active campaigns, and valid integration.
                    </p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-warm-100 bg-white p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={closeHelp} className="game-secondary">
            I Understand
          </button>
          <button
            type="button"
            onClick={() =>
              openAdsGalaxyBot(window as Parameters<typeof openAdsGalaxyBot>[0])
            }
            className="game-primary"
          >
            Open Ads Galaxy Bot
          </button>
        </div>
      </dialog>

      <span className="sr-only">{ADS_GALAXY_BOT_URL}</span>
    </section>
  );
}
