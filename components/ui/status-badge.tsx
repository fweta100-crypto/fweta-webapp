import { Badge } from "@/components/ui/card";

type Tone = "neutral" | "gold" | "success" | "danger" | "muted";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  // Campaigns
  draft: { label: "Draft", tone: "muted" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "gold" },
  completed: { label: "Completed", tone: "neutral" },
  // Submissions & deposits
  pending: { label: "Pending", tone: "gold" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  flagged: { label: "Flagged", tone: "danger" },
  credited: { label: "Credited", tone: "success" },
  // Bookings
  requested: { label: "Awaiting reply", tone: "gold" },
  accepted: { label: "Accepted", tone: "neutral" },
  in_progress: { label: "In progress", tone: "neutral" },
  delivered: { label: "Delivered", tone: "gold" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

export function statusLabel(status: string) {
  return STATUS[status]?.label ?? status.replace(/_/g, " ");
}

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS[status];
  return <Badge tone={entry?.tone ?? "muted"}>{entry?.label ?? status.replace(/_/g, " ")}</Badge>;
}
