"use client";
import { useEffect, useState } from "react";
export function GameRewardsForm({
  tenantSlug,
  gameKey,
}: {
  tenantSlug: string;
  gameKey: string;
}) {
  const [data, setData] = useState<Record<string, any> | null>(null),
    [message, setMessage] = useState("Loading…");
  const endpoint = `/api/${tenantSlug}/admin/games/${gameKey}/rewards`;
  useEffect(() => {
    fetch(endpoint)
      .then((r) => r.json())
      .then((x) => {
        setData(x);
        setMessage("");
      });
  }, [endpoint]);
  if (!data) return <p>{message}</p>;
  const memory = gameKey === "memory-match", maze = gameKey === "maze-runner",
    set = (key: string, value: any) => setData({ ...data, [key]: value });
  async function save() {
    setMessage("Saving…");
    const r = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      x = await r.json();
    if (r.ok) setData(x);
    setMessage(
      r.ok ? "Rewards saved and audit logged." : (x.error ?? "Could not save."),
    );
  }
  return (
    <div className="max-w-2xl">
      <section className="grid gap-4 rounded-3xl bg-white p-5 shadow-card sm:grid-cols-2">
        {memory ? (
          <>
            <Toggle
              label="Money reward enabled"
              checked={data.moneyRewardEnabled}
              change={(v) => set("moneyRewardEnabled", v)}
            />
            <Field
              label="Wallet reward amount"
              value={data.moneyRewardAmount}
              step=".01"
              change={(v) => set("moneyRewardAmount", v)}
            />
            <Toggle
              label="Coin reward enabled"
              checked={data.coinRewardEnabled}
              change={(v) => set("coinRewardEnabled", v)}
            />
            <Field
              label="Minimum coin reward"
              value={data.minimumCoinReward}
              change={(v) => set("minimumCoinReward", Number(v))}
            />
            <Field
              label="Maximum coin reward"
              value={data.maximumCoinReward}
              change={(v) => set("maximumCoinReward", Number(v))}
            />
          </>
        ) : maze ? (
          <>
            <Field label="Base completion points" value={data.baseCompletionPoints} change={(v) => set("baseCompletionPoints", Number(v))}/>
            <Field label="Collectible points" value={data.collectiblePoints} change={(v) => set("collectiblePoints", Number(v))}/>
            <Field label="Bonus chest points" value={data.bonusChestPoints} change={(v) => set("bonusChestPoints", Number(v))}/>
          </>
        ) : (
          <>
            <Toggle
              label="Verified wallet reward enabled"
              checked={data.walletRewardEnabled}
              change={(v) => set("walletRewardEnabled", v)}
            />
            <Field
              label="Verified wallet reward amount"
              value={data.walletRewardAmount}
              step=".01"
              change={(v) => set("walletRewardAmount", v)}
            />
          </>
        )}
      </section>
      <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-950">
        Browser ad completion alone does not authorize withdrawable money.
        Platform verification and safety controls remain enforced.
      </p>
      <button onClick={() => void save()} className="game-primary mt-4">
        Save rewards
      </button>
      <p className="mt-2 text-xs font-bold text-teal-700">{message}</p>
    </div>
  );
}
function Toggle({
  label,
  checked,
  change,
}: {
  label: string;
  checked: boolean;
  change: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-warm-50 px-3 text-sm font-bold">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => change(e.target.checked)}
        className="h-5 w-5 accent-teal-600"
      />
    </label>
  );
}
function Field({
  label,
  value,
  change,
  step,
}: {
  label: string;
  value: any;
  change: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold">
      {label}
      <input
        type="number"
        min="0"
        step={step ?? "1"}
        value={value}
        onChange={(e) => change(e.target.value)}
        className="min-h-11 rounded-xl border px-3"
      />
    </label>
  );
}
