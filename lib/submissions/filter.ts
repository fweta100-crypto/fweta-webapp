import type { Campaign, Profile, Submission } from "@/lib/db/types";
import type { SocialPlatform, SubmissionStatus } from "@/types/enums";

export type SubmissionSort = "newest" | "earnings" | "views";

export type SubmissionFilters = {
  q: string;
  status: "all" | SubmissionStatus;
  campaignId: string;
  clipperId: string;
  platform: "all" | SocialPlatform;
  sort: SubmissionSort;
};

const STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected", "flagged"];
const PLATFORMS: SocialPlatform[] = ["tiktok", "youtube", "instagram", "x"];
const SORTS: SubmissionSort[] = ["newest", "earnings", "views"];

export function parseSubmissionFilters(
  params: Record<string, string | undefined>,
  defaults?: Partial<SubmissionFilters>,
): SubmissionFilters {
  const statusRaw = params.status ?? defaults?.status ?? "all";
  const sortRaw = params.sort ?? defaults?.sort ?? "newest";
  const platformRaw = params.platform ?? defaults?.platform ?? "all";

  return {
    q: (params.q ?? defaults?.q ?? "").trim(),
    status: STATUSES.includes(statusRaw as SubmissionStatus)
      ? (statusRaw as SubmissionStatus)
      : "all",
    campaignId: params.campaign ?? defaults?.campaignId ?? "",
    clipperId: params.creator ?? defaults?.clipperId ?? "",
    platform: PLATFORMS.includes(platformRaw as SocialPlatform)
      ? (platformRaw as SocialPlatform)
      : "all",
    sort: SORTS.includes(sortRaw as SubmissionSort) ? (sortRaw as SubmissionSort) : "newest",
  };
}

export function applySubmissionFilters(
  submissions: Submission[],
  filters: SubmissionFilters,
  profiles: Profile[],
  campaigns: Campaign[],
): Submission[] {
  const q = filters.q.toLowerCase();
  const rows = submissions.filter((s) => {
    if (filters.status !== "all" && s.status !== filters.status) return false;
    if (filters.campaignId && s.campaignId !== filters.campaignId) return false;
    if (filters.clipperId && s.clipperId !== filters.clipperId) return false;
    if (filters.platform !== "all" && s.platform !== filters.platform) return false;
    if (q) {
      const creator = profiles.find((p) => p.id === s.clipperId);
      const campaign = campaigns.find((c) => c.id === s.campaignId);
      const hay = `${creator?.displayName ?? ""} ${creator?.email ?? ""} ${campaign?.title ?? ""} ${s.postUrl}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  rows.sort((a, b) => {
    if (filters.sort === "earnings") return b.earningsCents - a.earningsCents;
    if (filters.sort === "views") return b.views - a.views;
    return b.createdAt.localeCompare(a.createdAt);
  });
  return rows;
}
