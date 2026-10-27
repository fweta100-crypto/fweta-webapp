"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { refreshCampaignEarningsAction } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export function CampaignRefreshButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const res = await refreshCampaignEarningsAction(campaignId);
            if (!res.ok) {
              setMessage(res.error);
              return;
            }
            setMessage(
              res.updated === 0
                ? "No new views yet."
                : `Updated ${res.updated} ${res.updated === 1 ? "clip" : "clips"} · ${formatMoney(res.creditedCents)} paid to creators.`,
            );
            router.refresh();
          });
        }}
      >
        {pending ? "Refreshing…" : "Refresh views & earnings"}
      </Button>
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}
