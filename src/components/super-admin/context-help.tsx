"use client";

import { CircleHelp, X } from "lucide-react";
import { useRef } from "react";

export type HelpContent = {
  title: string;
  summary: string;
  effect?: string;
  warning?: string;
  reversible?: string;
};

export function ContextHelp({ content }: { content: HelpContent }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  function close() {
    dialog.current?.close();
    button.current?.focus();
  }
  return <>
    <button ref={button} type="button" className="sa-icon" aria-label={`Help: ${content.title}`} onClick={() => dialog.current?.showModal()}>
      <CircleHelp size={18}/>
    </button>
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close(); }} className="m-auto w-[min(32rem,calc(100%-1rem))] rounded-3xl bg-[var(--sa-surface)] p-0 text-[var(--sa-text)] shadow-2xl backdrop:bg-slate-950/60">
      <div className="flex items-start gap-3 border-b border-[var(--sa-border)] p-5">
        <CircleHelp className="mt-0.5 shrink-0 text-[var(--sa-primary)]"/>
        <div className="min-w-0"><h2 className="text-lg font-black">{content.title}</h2><p className="sa-muted mt-1 text-sm">{content.summary}</p></div>
        <button type="button" className="sa-icon ml-auto shrink-0" aria-label="Close help" onClick={close}><X size={18}/></button>
      </div>
      <div className="grid gap-3 p-5 text-sm">
        {content.effect&&<p><strong>Effect:</strong> {content.effect}</p>}
        {content.warning&&<p className="rounded-xl bg-amber-500/10 p-3"><strong>Important:</strong> {content.warning}</p>}
        {content.reversible&&<p><strong>Reversible:</strong> {content.reversible}</p>}
      </div>
    </dialog>
  </>;
}

export const SUPER_ADMIN_HELP = {
  overview:{title:"Global Overview",summary:"The Overview combines data from every tenant. Unique users are counted once globally, while tenant memberships count each Mini App membership separately."},
  tenants:{title:"Tenants",summary:"A tenant is one Mini App operating on this shared platform. Creating a tenant creates database configuration and dynamic routes; it does not copy project files."},
  administrators:{title:"Administrators",summary:"Tenant Administrators manage assigned Mini Apps. Assignment changes an existing user’s membership; it does not create a second identity.",warning:"The person must open the Mini App once before assignment."},
  users:{title:"Global Users",summary:"Global users may belong to multiple tenants. A tenant ban affects one Mini App, while a global ban blocks the user across the platform."},
  games:{title:"Platform Games",summary:"Super Admin controls platform game mechanics and safety. Tenant Administrators control only supported tenant-funded reward values."},
  sponsored:{title:"Sponsored Content",summary:"Platform-controlled promotions displayed across targeted Mini Apps. This is separate from Ads Galaxy advertisements."},
  finance:{title:"Global Finance",summary:"Finance shows platform liabilities and withdrawal activity.",warning:"Supported repairs use immutable ledger entries and never directly overwrite balances."},
  integrations:{title:"Integrations",summary:"Integration credentials remain encrypted. Resetting removes or replaces access without revealing the existing secret."},
  settings:{title:"Platform Settings",summary:"Platform settings affect the shared system. New-tenant defaults apply only to tenants created afterward."},
  inactivity:{title:"Tenant inactivity",summary:"Evaluates legitimate new user memberships during completed activity windows.",effect:"Eligible tenants may be temporarily suspended; users, balances, history and integrations are preserved.",reversible:"Only a Super Admin can resume an inactivity-suspended tenant."},
} satisfies Record<string,HelpContent>;
