"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  approveBookingAction,
  cancelBookingAction,
  requestBookingChangesAction,
} from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";

export function BrandBookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    <div>
      <Button
        size="sm"
        variant="gold"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await approveBookingAction(bookingId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.refresh();
          })
        }
      >
        {pending ? "Approving…" : "Approve & release payment"}
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}
