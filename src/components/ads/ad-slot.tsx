import { Megaphone } from "lucide-react";

export function AdSlot({ placement = "games-home-feed" }: { placement?: string }) {
  return (
    <aside data-ad-placement={placement} aria-label="Advertisement"
      className="relative flex min-h-28 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-warm-400/35 bg-white/60 p-5">
      <div className="text-center">
        <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-warm-100 text-warm-600"><Megaphone size={17} /></div>
        <p className="text-xs font-extrabold uppercase tracking-[.16em] text-warm-600">Advertisement</p>
        <p className="mt-1 text-[11px] text-warm-400">Ads Galaxy placement ready</p>
      </div>
      <div className="absolute inset-x-8 bottom-2 h-1 overflow-hidden rounded-full bg-warm-100">
        <div className="h-full w-1/3 animate-pulse-soft rounded-full bg-teal-500/45" />
      </div>
    </aside>
  );
}
