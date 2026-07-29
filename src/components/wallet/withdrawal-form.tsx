"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlatformPopup } from "@/components/system/platform-popup";

type Method = {
  id: string;
  name: string;
  currency: string;
  network: string;
  networkName: string;
  providerMinimum: string;
  providerFee: string;
  memoSupported: boolean;
  automaticEligible: boolean;
  minimumAmount: string;
  maximumAmount: string;
  fixedFee: string;
  feeBasisPoints: number;
};

export function WithdrawalForm() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [wallet, setWallet] = useState<{ availableBalance: string; withdrawalHoldBalance: string; minimumWithdrawal: string; maximumWithdrawal: string; withdrawalProcessingMode: string } | null>(null);
  useEffect(() => {
    void fetch("/api/wallet/payout-methods", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setMethods(body.items);
        setMethodId(body.items[0]?.id ?? "");
      })
      .catch((error) => setMessage(error.message));
    void fetch("/api/wallet", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setWallet(body);
    }).catch((error) => setMessage(error.message));
  }, []);
  const selected = methods.find((method) => method.id === methodId);
  const estimate = useMemo(() => {
    if (!selected || !amount) return null;
    const walletAmount = Number(amount);
    const platformFee =
      Number(selected.fixedFee) +
      (walletAmount * selected.feeBasisPoints) / 10_000;
    const gross = selected.automaticEligible
      ? Math.max(0, walletAmount - platformFee)
      : null;
    const received =
      gross === null ? null : Math.max(0, gross - Number(selected.providerFee));
    return { walletAmount, platformFee, gross, received };
  }, [amount, selected]);
  async function submit(confirmed = false) {
    if (!selected) return;
    if (!confirmed) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setMessage("Reserving funds and creating your withdrawal…");
    const response = await fetch("/api/wallet/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payoutMethodId: selected.id,
        amount,
        destination,
        memo: memo || undefined,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const body = await response.json();
    if (response.ok) {
      setAmount("");
      setDestination("");
      setMemo("");
      setMessage(
        body.status === "PROCESSING"
          ? "Your withdrawal is being processed."
          : "Your withdrawal is pending review.",
      );
    } else setMessage(body.error ?? "This withdrawal could not be created.");
  }
  return (
    <div className="grid gap-5">
      {confirming && selected && (
        <PlatformPopup
          title="Confirm withdrawal"
          message={`Confirm ${selected.currency} on ${selected.networkName}. Only use a wallet address that supports the selected currency and network. Using the wrong network may permanently lose funds.`}
          dismissible
          onClose={() => setConfirming(false)}
          primary={{ label: "Submit Withdrawal", onClick: () => void submit(true) }}
          secondary={{ label: "Cancel", onClick: () => setConfirming(false) }}
        />
      )}
      <section className="rounded-3xl bg-white p-5 shadow-card">
        {wallet && <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl bg-warm-50 p-4 text-xs sm:grid-cols-4"><p><b>Available</b><br />${Number(wallet.availableBalance).toFixed(2)}</p><p><b>Pending hold</b><br />${Number(wallet.withdrawalHoldBalance).toFixed(2)}</p><p><b>Limits</b><br />${Number(wallet.minimumWithdrawal).toFixed(2)}–${Number(wallet.maximumWithdrawal).toFixed(2)}</p><p><b>Processing</b><br />{wallet.withdrawalProcessingMode === "MANUAL" ? "Manual review" : "Automatic provider"}</p></div>}
        <label className="grid gap-1 text-xs font-bold">
          Withdrawal amount (USD)
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="min-h-11 rounded-xl border px-3"
          />
        </label>
        <label className="mt-4 grid gap-1 text-xs font-bold">
          Currency and network
          <select
            value={methodId}
            onChange={(event) => setMethodId(event.target.value)}
            className="min-h-11 rounded-xl border px-3"
          >
            <option value="">Select an enabled payout option</option>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.currency} · {method.networkName}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <div className="mt-3 rounded-xl bg-warm-50 p-3 text-xs text-warm-600">
            <p>
              Provider minimum: {selected.providerMinimum} {selected.currency}
            </p>
            <p>
              Estimated provider fee: {selected.providerFee} {selected.currency}
            </p>
            <p>
              {selected.automaticEligible
                ? "Automatic conversion policy available."
                : "Manual processing only; final crypto amount is determined during review."}
            </p>
          </div>
        )}
        <label className="mt-4 grid gap-1 text-xs font-bold">
          Destination wallet address
          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            autoComplete="off"
            className="min-h-11 rounded-xl border px-3"
          />
        </label>
        {selected?.memoSupported && (
          <label className="mt-4 grid gap-1 text-xs font-bold">
            Memo or tag
            <input
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="min-h-11 rounded-xl border px-3"
            />
          </label>
        )}
      </section>
      {estimate && (
        <section className="rounded-3xl bg-teal-50 p-5 text-sm text-teal-950">
          <h2 className="font-black">Estimate</h2>
          <dl className="mt-3 grid gap-2">
            <Row
              label="Wallet amount deducted"
              value={`$${estimate.walletAmount.toFixed(2)}`}
            />
            <Row
              label="Platform withdrawal fee"
              value={`$${estimate.platformFee.toFixed(2)}`}
            />
            <Row
              label="OxaPay/network fee"
              value={`${selected?.providerFee} ${selected?.currency}`}
            />
            <Row
              label="Estimated crypto received"
              value={
                estimate.received === null
                  ? "Calculated during manual review"
                  : `${estimate.received.toFixed(6)} ${selected?.currency}`
              }
            />
          </dl>
        </section>
      )}
      <button
        disabled={!selected || !amount || !destination}
        onClick={() => void submit()}
        className="game-primary min-h-12 disabled:opacity-40"
      >
        Review and confirm
      </button>
      <p
        aria-live="polite"
        className="text-center text-xs font-bold text-coral-700"
      >
        {message}
      </p>
      <Link
        href="/wallet"
        className="text-center text-xs font-black text-teal-700"
      >
        Back to Wallet
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right font-black">{value}</dd>
    </div>
  );
}
