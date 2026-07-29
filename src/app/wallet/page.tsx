import { AppShell } from "@/components/layout/app-shell";
import { WalletView } from "@/components/wallet/wallet-view";
import { requireWalletPage } from "@/lib/page-auth";
export default async function WalletPage() {
  await requireWalletPage();
  return (
    <AppShell>
      <main>
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-600">
          Secure ledger
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">Wallet</h1>
        <p className="mb-7 mt-2 text-sm text-warm-600">
          Available money, pending game rewards, withdrawal holds and
          points—clearly separated.
        </p>
        <WalletView />
      </main>
    </AppShell>
  );
}
