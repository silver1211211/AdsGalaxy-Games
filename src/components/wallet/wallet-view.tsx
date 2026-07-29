"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  Clock3,
  Coins,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { PlatformPopup } from "@/components/system/platform-popup";
type MoneyTx = {
  id: string;
  type: string;
  status: string;
  amount: string;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
};
type PointTx = {
  id: string;
  amount: number;
  description: string | null;
  createdAt: string;
};
type Withdrawal = {
  id: string;
  status: string;
  amount: string;
  destinationMasked: string;
  payoutMethod: { name: string };
  createdAt: string;
};
type Data = {
  availableBalance: string;
  pendingRewardBalance: string;
  withdrawalHoldBalance: string;
  lifetimeEarnings: string;
  totalWithdrawn: string;
  totalPoints: number;
  pendingRewardCount: number;
  completedRewardCount: number;
  pointConversionEnabled: boolean;
  withdrawalsEnabled: boolean;
  minimumWithdrawal: string;
  pointsPerDollar: number;
  minimumConversionPoints: number;
  maximumConversionPointsRequest: number;
  maximumConversionPointsDay: number;
  recentTransactions: MoneyTx[];
  recentPointTransactions: PointTx[];
  recentWithdrawals: Withdrawal[];
  updatedAt: string;
};
const money = (value: string) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: n !== 0 && Math.abs(n) < 0.01 ? 6 : 2,
  }).format(n);
};
export function WalletView() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [points, setPoints] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmConversion, setConfirmConversion] = useState(false),
    [resultPopup, setResultPopup] = useState<{ title: string; message: string } | null>(null);
  const load = useCallback(async () => {
    setError("");
    const r = await fetch("/api/wallet", { cache: "no-store" });
    if (!r.ok)
      throw new Error(
        r.status === 401
          ? "Open this Mini App inside Telegram or use local development access."
          : "Wallet unavailable",
      );
    setData(await r.json());
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  async function convert() {
    if (!data) return;
    setBusy(true);
    const r = await fetch("/api/wallet/convert-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: Number(points),
          idempotencyKey: crypto.randomUUID(),
        }),
      }),
      b = await r.json();
    setBusy(false);
    if (!r.ok) {
      setResultPopup({ title: "Conversion unavailable", message: b.error ?? "Conversion failed" });
      return;
    }
    setPoints("");
    await load();
    setResultPopup({ title: "Conversion successful", message: `${b.points.toLocaleString()} points were converted into $${b.netAmount}.` });
  }
  if (!data)
    return (
      <div className="grid min-h-64 place-items-center rounded-4xl bg-white shadow-card">
        <p className="flex items-center gap-2 text-sm text-warm-500">
          {!error && <LoaderCircle className="animate-spin" size={17} />}{" "}
          {error || "Loading secure wallet…"}
        </p>
      </div>
    );
  return (
    <div className="grid gap-5">
      {confirmConversion && data && (
        <PlatformPopup
          title="Confirm point conversion"
          message={`Convert ${Number(points).toLocaleString()} points at ${data.pointsPerDollar.toLocaleString()} points per $1.00?`}
          dismissible
          onClose={() => setConfirmConversion(false)}
          primary={{ label: "Convert Points", onClick: () => { setConfirmConversion(false); void convert(); } }}
          secondary={{ label: "Cancel", onClick: () => setConfirmConversion(false) }}
        />
      )}
      {resultPopup && (
        <PlatformPopup
          title={resultPopup.title}
          message={resultPopup.message}
          dismissible
          onClose={() => setResultPopup(null)}
          primary={{ label: "Done", onClick: () => setResultPopup(null) }}
        />
      )}
      <section className="overflow-hidden rounded-4xl bg-ink p-6 text-white shadow-float">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-200">
              Available balance
            </p>
            <p className="mt-2 break-all text-4xl font-black">
              {money(data.availableBalance)}
            </p>
            <p className="mt-1 text-xs text-white/50">
              Available to withdraw or use
            </p>
          </div>
          <button
            aria-label="Refresh wallet"
            onClick={() => void load()}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"
          >
            <RefreshCw size={17} />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            ["Pending rewards", data.pendingRewardBalance],
            ["Withdrawal hold", data.withdrawalHoldBalance],
            ["Total points", data.totalPoints.toLocaleString()],
          ].map(([label, value], i) => (
            <div key={label} className="rounded-2xl bg-white/[.07] p-3">
              <p className="text-[9px] uppercase text-white/50">{label}</p>
              <p className="mt-1 break-all text-sm font-extrabold">
                {i < 2 ? money(String(value)) : value}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Lifetime", money(data.lifetimeEarnings)],
          ["Withdrawn", money(data.totalWithdrawn)],
          ["Verified rewards", data.completedRewardCount],
          ["Awaiting verification", data.pendingRewardCount],
        ].map(([a, b]) => (
          <div key={a} className="rounded-3xl bg-white p-4 shadow-card">
            <p className="text-xs text-warm-500">{a}</p>
            <p className="mt-1 font-black">{b}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-4xl bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-extrabold">
            <ArrowRightLeft className="text-teal-600" />
            Convert points
          </h2>
          <p className="mt-2 text-xs text-warm-500">
            {data.pointConversionEnabled
              ? `${data.pointsPerDollar.toLocaleString()} points per $1.00 · minimum ${data.minimumConversionPoints.toLocaleString()}`
              : "Point conversion is currently unavailable."}
          </p>
          {data.pointConversionEnabled && (
            <div className="mt-4 flex gap-2">
              <input
                aria-label="Points to convert"
                type="number"
                min={data.minimumConversionPoints}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-xl border px-3"
              />
              <button
                disabled={busy}
                onClick={() => setConfirmConversion(true)}
                className="game-primary"
              >
                Convert
              </button>
            </div>
          )}
        </div>
        <div className="rounded-4xl bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-extrabold">
            <ArrowDownToLine className="text-coral-500" />
            Withdraw
          </h2>
          <p className="mt-2 text-xs text-warm-500">
            {data.withdrawalsEnabled
              ? `Available with configured payout methods · minimum ${money(data.minimumWithdrawal)}`
              : "Withdrawals are currently unavailable."}
          </p>
          {data.withdrawalsEnabled && (
            <Link href="/wallet/withdraw" className="game-primary mt-4">
              Withdraw
            </Link>
          )}
        </div>
      </section>
      <section className="rounded-4xl bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <WalletCards className="text-teal-600" />
          Recent wallet activity
        </h2>
        <div className="mt-4 grid gap-2">
          {data.recentTransactions.length ? (
            data.recentTransactions.map((row) => (
              <History
                key={row.id}
                title={row.description ?? row.type}
                value={`${Number(row.amount) >= 0 ? "+" : ""}${money(row.amount)}`}
                note={row.status}
                date={row.createdAt}
              />
            ))
          ) : (
            <Empty text="No wallet activity yet." />
          )}
        </div>
      </section>
      <section className="rounded-4xl bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Coins className="text-amber-500" />
          Point activity
        </h2>
        <div className="mt-4 grid gap-2">
          {data.recentPointTransactions.length ? (
            data.recentPointTransactions.map((row) => (
              <History
                key={row.id}
                title={row.description ?? "Point transaction"}
                value={`${row.amount >= 0 ? "+" : ""}${row.amount.toLocaleString()} points`}
                note="Points ledger"
                date={row.createdAt}
              />
            ))
          ) : (
            <Empty text="No point activity yet." />
          )}
        </div>
      </section>
      {data.recentWithdrawals.length > 0 && (
        <section className="rounded-4xl bg-white p-5 shadow-card">
          <h2 className="font-extrabold">Withdrawal status</h2>
          {data.recentWithdrawals.map((w) => (
            <History
              key={w.id}
              title={`${w.payoutMethod.name} · ${w.destinationMasked}`}
              value={money(w.amount)}
              note={w.status.replaceAll("_", " ")}
              date={w.createdAt}
            />
          ))}
        </section>
      )}
      <p
        aria-live="polite"
        className="text-center text-xs font-bold text-coral-600"
      >
        {error}
      </p>
      <aside className="flex gap-3 rounded-3xl bg-teal-50 p-4 text-xs leading-5 text-teal-900">
        <ShieldCheck className="shrink-0" />
        <p>
          Available money is verified ledger value. Pending game rewards await
          provider verification. Points are separate from money. Withdrawal
          holds are already reserved.
        </p>
      </aside>
    </div>
  );
}
function History({
  title,
  value,
  note,
  date,
}: {
  title: string;
  value: string;
  note: string;
  date: string;
}) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl bg-warm-50 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold">{title}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-warm-400">
          <Clock3 size={11} />
          {new Date(date).toLocaleString()} · {note}
        </p>
      </div>
      <p className="shrink-0 text-sm font-extrabold text-teal-700">{value}</p>
    </article>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-500">{text}</p>
  );
}
