import { Clock3, Flame, Layers3, MousePointerClick, Shuffle } from "lucide-react";
export function GameHud({ level, moves, matched, total, combo, seconds, shuffles }: {
  level: number; moves: number; matched: number; total: number; combo: number; seconds: number; shuffles: number;
}) {
  const items = [
    { label: "Moves", value: moves, icon: MousePointerClick },
    { label: "Pairs", value: `${matched}/${total}`, icon: Layers3 },
    { label: "Combo", value: `${combo}×`, icon: Flame },
    { label: "Shuffles", value: shuffles, icon: Shuffle },
    { label: "Time", value: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, icon: Clock3 }
  ];
  return <div><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-teal-600">Memory Match</p><h1 className="text-2xl font-extrabold">Level {level}</h1></div><p className="text-xs font-bold text-warm-400">{total - matched} pairs remaining</p></div>
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">{items.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-white bg-white p-2 text-center shadow-card sm:p-3"><Icon className="mx-auto mb-1 text-teal-600" size={15} /><p className="truncate text-[11px] font-extrabold sm:text-sm">{value}</p><p className="hidden text-[9px] font-bold uppercase text-warm-400 sm:block">{label}</p></div>)}</div>
  </div>;
}
