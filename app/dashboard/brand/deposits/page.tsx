import { format } from "date-fns";
import { redirect } from "next/navigation";

import { BrandDepositForm } from "@/components/forms/brand-deposit-form";
import { Card, PageHeader, SectionHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/db/store";
import { formatMoney } from "@/lib/utils";

export default async function BrandDepositsPage() {
  const session = await getSession();
  if (!session?.roles.includes("brand") && !session?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const store = await readStore();
  const deposits = store.brandDeposits
    .filter((d) => d.brandId === session.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const wallet = store.wallets.find((w) => w.userId === session.id);
  const pendingTotal = deposits
    .filter((d) => d.status === "pending")
    .reduce((sum, d) => sum + d.amountCents, 0);

  return (
    <div className="dash-stack">
      <PageHeader
        title="Deposits"
        description="Fund your wallet by EFT to pay for campaigns and bookings."
      />

      <div className="dash-split">
        <Card>
          <h2 className="font-display text-xl tracking-tight">Record a deposit</h2>
          <p className="mt-1 text-sm text-muted">Tell us how much you sent and the EFT reference.</p>
          <div className="mt-4">
            <BrandDepositForm />
          </div>
        </Card>

        <Card className="bg-surface">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Wallet balance
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight">
            {formatMoney(wallet?.availableCents ?? 0)}
          </p>
          {pendingTotal > 0 ? (
            <p className="mt-1 text-sm text-muted">
              + {formatMoney(pendingTotal)} waiting for confirmation
            </p>
          ) : null}
          <ol className="mt-5 space-y-3 border-t border-border/80 pt-4 text-sm">
            {[
              "Send an EFT to fweta's bank account.",
              "Record the amount and reference here.",
              "An admin confirms it and credits your wallet.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-gold-deep">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {deposits.length > 0 ? (
        <section>
          <SectionHeader title="History" />
          <ul className="space-y-2.5">
            {deposits.map((d) => (
              <li key={d.id} className="list-row">
                <div className="min-w-0">
                  <p className="font-display text-xl tracking-tight">{formatMoney(d.amountCents)}</p>
                  {d.note ? <p className="truncate text-sm text-muted">{d.note}</p> : null}
                  <p className="mt-1 text-xs text-muted-light">
                    {format(new Date(d.createdAt), "d MMM yyyy")}
                    {d.status === "pending" ? " · waiting for an admin" : ""}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
