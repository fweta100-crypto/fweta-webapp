"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { creditBrandDepositAction, rejectBrandDepositAction } from "@/app/actions/wallet";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";

export function DepositAdminActions({ depositId }: { depositId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="gold"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await creditBrandDepositAction(depositId);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Working…" : "Credit"}
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await rejectBrandDepositAction(depositId);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        Reject
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}
