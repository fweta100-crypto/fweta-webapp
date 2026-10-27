import { format } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCampaign } from "@/app/actions/campaigns";
import { CampaignRefreshButton } from "@/components/forms/campaign-refresh-button";
import { CampaignStatusButtons } from "@/components/forms/campaign-status-buttons";
import { Badge, Card, PageHeader, Stat, StatGrid } from "@/components/ui/card";
import { BudgetBar } from "@/components/ui/budget-bar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/db/store";
import { formatMoney } from "@/lib/utils";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.roles.includes("brand") && !session?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  if (campaign.brandId !== session.id && !session.roles.includes("admin")) {
    redirect("/dashboard/brand/campaigns");
  }

  const store = await readStore();
  const clips = store.submissions.filter((s) => s.campaignId === campaign.id);
  const pendingCount = clips.filter((s) => s.status === "pending").length;
  const approvedCount = clips.filter((s) => s.status === "approved").length;

  return (
    <div className="dash-stack">
      <PageHeader
        title={campaign.title}
        description={campaign.description}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/brand/campaigns/${id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </Link>
            <Link href={`/dashboard/brand/campaigns/${id}/submissions`}>
              <Button size="sm">Review clips{pendingCount ? ` (${pendingCount})` : ""}</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={campaign.status} />
        <Badge>{campaign.type === "ugc" ? "UGC" : "Clipping"}</Badge>
        <Badge tone="neutral">{campaign.category}</Badge>
        {campaign.endDate ? (
          <Badge tone="muted">Ends {format(new Date(campaign.endDate), "d MMM yyyy")}</Badge>
        ) : null}
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Budget
            </p>
            <p className="mt-2 font-display text-3xl tracking-tight">
              {formatMoney(Math.max(0, campaign.budgetTotalCents - campaign.budgetSpentCents))}
              <span className="ml-2 text-sm font-sans text-muted">left</span>
            </p>
          </div>
        </div>
        <BudgetBar
          className="mt-4"
          spentCents={campaign.budgetSpentCents}
          totalCents={campaign.budgetTotalCents}
        />
        <div className="mt-5 flex flex-wrap items-start gap-3 border-t border-border/80 pt-4">
          <CampaignStatusButtons campaignId={campaign.id} status={campaign.status} />
          {campaign.status === "active" ? <CampaignRefreshButton campaignId={campaign.id} /> : null}
        </div>
        {campaign.status === "active" ? (
          <p className="mt-2 text-xs text-muted">Earnings also update automatically once a day.</p>
        ) : null}
      </Card>

      <StatGrid>
        <Stat label="CPM" value={formatMoney(campaign.cpmCents)} hint="Paid per 1,000 views" />
        <Stat label="Max per video" value={formatMoney(campaign.maxPayoutPerSubmissionCents)} />
        <Stat
          label="Clips"
          value={String(clips.length)}
          hint={`${approvedCount} approved · ${pendingCount} to review`}
        />
        <Stat
          label="Platforms"
          value={String(campaign.platforms.length)}
          hint={campaign.platforms.map((p) => (p === "x" ? "X" : p[0].toUpperCase() + p.slice(1))).join(", ")}
        />
      </StatGrid>

      {campaign.requirements ? (
        <Card className="panel-interactive">
          <h2 className="font-display text-xl tracking-tight">Requirements</h2>
          <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {campaign.requirements}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
