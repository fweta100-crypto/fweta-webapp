"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  approveBookingAction,
  cancelBookingAction,
  requestBookingChangesAction,
} from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function BrandBookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);
  const [note, setNote] = useState("");

  if (status !== "delivered" && status !== "requested") return null;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else onDone?.();
      router.refresh();
    });
  }

  if (status === "requested") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Withdraw this request? The held money returns to your wallet.")) return;
            run(() => cancelBookingAction(bookingId));
          }}
        >
          {pending ? "Withdrawing…" : "Withdraw & refund"}
        </Button>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-2">
      {revising ? (
        <div className="w-full space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should the influencer change?"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending || note.trim().length < 5}
              onClick={() =>
                run(
                  () => requestBookingChangesAction(bookingId, note),
                  () => {
                    setRevising(false);
                    setNote("");
                  },
                )
              }
            >
              {pending ? "Sending…" : "Send back for changes"}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRevising(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="gold"
            disabled={pending}
            onClick={() => run(() => approveBookingAction(bookingId))}
          >
            {pending ? "Approving…" : "Approve & release payment"}
          </Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => setRevising(true)}>
            Request changes
          </Button>
        </div>
      )}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
