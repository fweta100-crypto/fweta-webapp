"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { reviewSubmissionAction } from "@/app/actions/submissions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

export function SubmissionReviewForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function review(status: "approved" | "rejected" | "flagged", note?: string) {
    setError(null);
    startTransition(async () => {
      const res = await reviewSubmissionAction(submissionId, { status, reviewNote: note });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor={`note-${submissionId}`}>Note for the creator (optional)</Label>
        <Input
          id={`note-${submissionId}`}
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why you are rejecting or flagging this clip"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="gold" disabled={pending} onClick={() => review("approved")}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => review("rejected", note || undefined)}
        >
          Reject
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => review("flagged", note || "Flagged")}
        >
          Flag
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
