import { redirect } from "next/navigation";

import { listDepositsAdmin } from "@/app/actions/wallet";
import { DepositAdminActions } from "@/components/forms/deposit-admin-actions";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/db/store";
import { formatMoney } from "@/lib/utils";

export default async function AdminDepositsPage() {
  const session = await getSession();
  if (!session?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const [deposits, store] = await Promise.all([listDepositsAdmin(), readStore()]);

  return (
    <div className="dash-stack">
      <PageHeader
        title="Deposits"
        description="Confirm brand EFT deposits before crediting wallets."
      />

      {deposits.length === 0 ? (
        <EmptyState
          title="No deposits"
          description="Brand deposit records will appear here."
        />
      ) : (
        <ul className="space-y-2.5">
          {deposits.map((d) => {
            const brand = store.profiles.find((p) => p.id === d.brandId);
            return (
              <li key={d.id} className="list-row items-start">
                <div className="w-full space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{brand?.displayName ?? brand?.email ?? "Brand"}</p>
                      <p className="mt-1 font-display text-2xl tracking-tight">
                        {formatMoney(d.amountCents)}
                      </p>
                      <p className="mt-2 text-sm text-muted">{d.note}</p>
                      <p className="text-xs text-muted">{new Date(d.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge
                      tone={
                        d.status === "credited"
                          ? "success"
                          : d.status === "rejected"
                            ? "danger"
                            : "gold"
                      }
                    >
                      {d.status}
                    </Badge>
                  </div>
                  {d.status === "pending" ? (
                    <div className="border-t border-border/80 pt-3">
                      <DepositAdminActions depositId={d.id} />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
