import { Megaphone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listBrandCampaigns } from "@/app/actions/campaigns";
import { listBrandSubmissions } from "@/app/actions/submissions";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { BudgetBar } from "@/components/ui/budget-bar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSession } from "@/lib/auth/session";
import { formatMoney } from "@/lib/utils";

export default async function BrandCampaignsPage() {
  const session = await getSession();
  if (!session?.roles.includes("brand") && !session?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const [campaigns, submissions] = await Promise.all([
    listBrandCampaigns(),
    listBrandSubmissions(),
  ]);
  const pendingTotal = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="dash-stack">
      <PageHeader
        title="Campaigns"
        description="Manage content rewards campaigns and budgets."
        action={
          <div className="flex flex-wrap gap-2">
            {pendingTotal ? (
              <Link href="/dashboard/brand/submissions">
                <Button size="sm" variant="secondary">
                  Review {pendingTotal} {pendingTotal === 1 ? "clip" : "clips"}
                </Button>
              </Link>
            ) : null}
            <Link href="/dashboard/brand/campaigns/new">
              <Button size="sm">New campaign</Button>
            </Link>
          </div>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to start receiving clip submissions."
          action={
            <Link href="/dashboard/brand/campaigns/new">
              <Button size="sm">Create campaign</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {campaigns.map((c) => {
            const pending = submissions.filter(
              (s) => s.campaignId === c.id && s.status === "pending",
            ).length;
            return (
              <li key={c.id}>
                <Link href={`/dashboard/brand/campaigns/${c.id}`} className="list-row">
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{c.title}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {c.type === "ugc" ? "UGC" : "Clipping"} · {c.category} ·{" "}
                        {formatMoney(c.cpmCents)} CPM
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 sm:w-72">
                      <BudgetBar spentCents={c.budgetSpentCents} totalCents={c.budgetTotalCents} />
                      {pending ? <Badge tone="gold">{pending} to review</Badge> : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
