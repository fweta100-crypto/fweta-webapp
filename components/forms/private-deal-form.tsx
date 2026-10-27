"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { requestPrivateDealAction } from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";

export function PrivateDealForm({
  influencerProfileId,
  influencerName,
}: {
  influencerProfileId: string;
  influencerName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const amount = parseFloat(String(fd.get("amount") || ""));
        if (Number.isNaN(amount) || amount <= 0) {
          setError("Enter a valid offer amount.");
          return;
        }
        setError(null);
        startTransition(async () => {
          const res = await requestPrivateDealAction({
            influencerProfileId,
            amountCents: Math.round(amount * 100),
            brief: String(fd.get("brief") || ""),
          });
          if (!res.ok) setError(res.error);
          else router.push("/dashboard/brand/bookings");
        });
      }}
    >
      <p className="text-sm text-muted">
        Offer {influencerName} a price. The amount is held in escrow until they decline or you
        approve delivery.
      </p>
      <div>
        <Label htmlFor="amount">Offer amount (NAD)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="2500.00"
        />
      </div>
      <div>
        <Label htmlFor="brief">Brief</Label>
        <Textarea
          id="brief"
          name="brief"
          required
          minLength={10}
          placeholder="Describe the private collaboration…"
        />
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send private offer"}
      </Button>
    </form>
  );
}
