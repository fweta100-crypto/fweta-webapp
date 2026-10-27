import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCampaign, listBrandCampaigns } from "@/app/actions/campaigns";
import { listBrandSubmissions } from "@/app/actions/submissions";
import { BrandSubmissionQueue } from "@/components/dashboard/brand-submission-queue";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/db/store";
import { parseSubmissionFilters } from "@/lib/submissions/filter";
import { formatMoney } from "@/lib/utils";

export default async function CampaignSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const filters = parseSubmissionFilters(flat, { campaignId: id, status: "pending" });

  const [allSubmissions, campaigns, store] = await Promise.all([
    listBrandSubmissions(),
    listBrandCampaigns(),
    readStore(),
  ]);

  const paidOnCampaign = allSubmissions
    .filter((s) => s.campaignId === id)
    .reduce((sum, s) => sum + s.earningsCents, 0);

  return (
    <div className="dash-stack">
      <PageHeader
        title="Clips"
        description={`${campaign.title} · ${formatMoney(paidOnCampaign)} paid to creators`}
        action={
          <Link href={`/dashboard/brand/campaigns/${id}`}>
            <Button size="sm" variant="secondary">
              ← Campaign
            </Button>
          </Link>
        }
      />

      <BrandSubmissionQueue
        submissions={allSubmissions}
        campaigns={campaigns}
        profiles={store.profiles}
        filters={filters}
        action={`/dashboard/brand/campaigns/${id}/submissions`}
        lockCampaignId={id}
      />
    </div>
  );
}
