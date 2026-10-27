import { Megaphone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listBrandCampaigns } from "@/app/actions/campaigns";
import { listBrandSubmissions } from "@/app/actions/submissions";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { BudgetBar } from "@/components/ui/budget-bar";
import { Button } from "@/components/ui/button";
import { campaignClipperVisibility } from "@/lib/campaigns/visibility";
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
        description="Clippers only see a campaign after you publish it. Drafts stay on this list and stay hidden."
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
            const visibility = campaignClipperVisibility(c.status);
            return (
            <li key={c.id}>
              <Link href={`/dashboard/brand/campaigns/${c.id}`} className="list-row items-start">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {c.type} · {c.category} · {formatMoney(c.budgetSpentCents)} /{" "}
                    {formatMoney(c.budgetTotalCents)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{visibility.label}</p>
                </div>
                <Badge tone={visibility.visible ? "gold" : "muted"}>{c.status}</Badge>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
