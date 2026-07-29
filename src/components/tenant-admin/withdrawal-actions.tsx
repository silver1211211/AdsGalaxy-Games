"use client";

import { useState } from "react";

export function WithdrawalActions({
  tenantSlug,
  withdrawalId,
  status,
  automatic,
}: {
  tenantSlug: string;
  withdrawalId: string;
  status: string;
  automatic: boolean;
}) {
  const [message, setMessage] = useState("");
  const endpoint = `/api/${tenantSlug}/admin/wallet/withdrawals/${withdrawalId}`;
  async function transition(next: string) {
    const note =
      next === "REJECTED" ? window.prompt("Reason for rejection") : undefined;
    if (next === "REJECTED" && !note) return;
    const externalId =
      next === "COMPLETED"
        ? window.prompt("Transaction hash or payout reference")
        : undefined;
    if (next === "COMPLETED" && !externalId) return;
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, note, externalId }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Withdrawal updated." : body.error);
    if (response.ok) location.reload();
  }
  async function reconcile() {
    const response = await fetch(`${endpoint}/reconcile`, { method: "POST" });
    const body = await response.json();
    setMessage(
      response.ok ? `Provider status: ${body.providerStatus}` : body.error,
    );
    if (response.ok) location.reload();
  }
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {status === "PENDING" && (
        <button
          onClick={() => void transition("UNDER_REVIEW")}
          className="game-secondary"
        >
          Review
        </button>
      )}
      {["PENDING", "UNDER_REVIEW"].includes(status) && (
        <button
          onClick={() => void transition("APPROVED")}
          className="game-secondary"
        >
          Approve
        </button>
      )}
      {status === "APPROVED" && (
        <button
          onClick={() => void transition("PROCESSING")}
          className="game-secondary"
        >
          Mark processing
        </button>
      )}
      {status === "PROCESSING" && !automatic && (
        <button
          onClick={() => void transition("COMPLETED")}
          className="game-secondary"
        >
          Complete manually
        </button>
      )}
      {["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"].includes(
        status,
      ) && (
        <button
          onClick={() => void transition("REJECTED")}
          className="game-secondary text-coral-700"
        >
          Reject
        </button>
      )}
      {automatic && status === "PROCESSING" && (
        <button onClick={() => void reconcile()} className="game-secondary">
          Refresh provider status
        </button>
      )}
      <span
        aria-live="polite"
        className="self-center text-xs font-bold text-coral-700"
      >
        {message}
      </span>
    </div>
  );
}
