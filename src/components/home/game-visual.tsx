import { BrainCircuit, CircleHelp, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

export function GameVisual({ kind }: { kind: "memory" | "quiz" | "tap" }) {
  const Icon = kind === "memory" ? BrainCircuit : kind === "quiz" ? CircleHelp : MousePointerClick;
  const styles = {
    memory: "bg-teal-50 text-teal-600",
    quiz: "bg-coral-50 text-coral-500",
    tap: "bg-[#f3f0ff] text-[#765ac9]"
  }[kind];
  return (
    <div className={cn("relative grid h-44 place-items-center overflow-hidden rounded-[1.65rem]", styles)}>
      <div className="absolute left-5 top-5 h-12 w-9 rotate-[-10deg] rounded-lg border-2 border-current opacity-20" />
      <div className="absolute bottom-4 right-6 h-16 w-12 rotate-[12deg] rounded-xl border-2 border-current opacity-15" />
      <div className="absolute right-1/4 top-3 h-3 w-3 rounded-full bg-current opacity-20" />
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white shadow-card transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2">
        <Icon size={38} strokeWidth={1.8} />
      </div>
    </div>
  );
}
