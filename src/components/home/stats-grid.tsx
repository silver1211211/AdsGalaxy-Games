import { Coins, Gamepad2, Trophy, WalletCards } from "lucide-react";

const stats = [
  { label: "Games played", value: "128", hint: "+12 this week", icon: Gamepad2, color: "bg-teal-50 text-teal-600" },
  { label: "Rewards earned", value: "4,860", hint: "total points", icon: Coins, color: "bg-coral-50 text-coral-500" },
  { label: "Current balance", value: "$12.40", hint: "ready to use", icon: WalletCards, color: "bg-[#f3f0ff] text-[#765ac9]" },
  { label: "Highest score", value: "9,240", hint: "personal best", icon: Trophy, color: "bg-[#fff8df] text-[#c78a17]" }
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon, color }) => (
        <article key={label} className="rounded-3xl border border-white bg-white p-4 shadow-card sm:p-5">
          <div className={`mb-5 grid h-10 w-10 place-items-center rounded-2xl ${color}`}><Icon size={19} /></div>
          <p className="text-xl font-extrabold tracking-tight sm:text-2xl">{value}</p>
          <p className="mt-1 text-xs font-bold text-warm-600">{label}</p>
          <p className="mt-0.5 text-[10px] text-warm-400">{hint}</p>
        </article>
      ))}
    </div>
  );
}
