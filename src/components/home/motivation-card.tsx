"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

const messages = [
  ["Keep playing.", "Small wins add up faster than you think."],
  ["More games, more rewards.", "Your next personal best is one play away."],
  ["Consistency pays.", "A few focused minutes can keep your streak alive."]
];

export function MotivationCard() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % messages.length), 6500);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="flex min-h-40 items-center justify-between overflow-hidden rounded-4xl bg-teal-600 p-6 text-white shadow-float sm:p-8">
      <div className="max-w-lg" key={index}>
        <p className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-teal-100"><Sparkles size={15} />Daily boost</p>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{messages[index][0]}</h2>
        <p className="mt-2 text-sm text-teal-100 sm:text-base">{messages[index][1]}</p>
      </div>
      <div className="hidden h-20 w-20 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 sm:grid">
        <ArrowRight size={28} />
      </div>
    </section>
  );
}
