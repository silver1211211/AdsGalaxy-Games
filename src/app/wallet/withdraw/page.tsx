import { WithdrawalForm } from "@/components/wallet/withdrawal-form";
import { requireSession } from "@/lib/session";

export default async function Page() {
  await requireSession();
  return (
    <main>
      <p className="text-xs font-black uppercase tracking-wider text-teal-600">
        Wallet
      </p>
      <h1 className="mt-1 text-3xl font-black">Withdraw</h1>
      <p className="mb-6 mt-2 text-sm text-warm-500">
        Select only currencies and networks enabled for this Mini App.
      </p>
      <WithdrawalForm />
    </main>
  );
}
