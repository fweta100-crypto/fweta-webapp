import { format } from "date-fns";
import { Handshake } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listBrandBookings } from "@/app/actions/bookings";
import { BrandBookingActions } from "@/components/forms/brand-booking-actions";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { bookingKind } from "@/lib/bookings/kind";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/db/store";
import { formatMoney } from "@/lib/utils";

export default async function BrandBookingsPage() {
  const session = await getSession();
  if (!session?.roles.includes("brand") && !session?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const [bookings, store] = await Promise.all([listBrandBookings(), readStore()]);

  return (
    <div className="dash-stack">
      <PageHeader
        title="Bookings"
        description="Influencer collaborations and escrow payments."
        action={
          <Link href="/dashboard/brand/creators">
            <Button size="sm" variant="secondary">
              Find creators
            </Button>
          </Link>
        }
      />

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings"
          description="Open the creator list to request a collaboration."
          action={
            <Link href="/dashboard/brand/creators">
              <Button size="sm">Find creators</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {bookings.map((b) => {
            const profile = store.influencerProfiles.find((p) => p.id === b.influencerProfileId);
            const isPrivate = bookingKind(b) === "private";
            const rate = b.rateCardItemId
              ? store.rateCards.find((r) => r.id === b.rateCardItemId)
              : undefined;
            return (
              <li key={b.id} className="list-row">
                <div className="w-full space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{profile?.displayName ?? "Influencer"}</p>
                      <p className="text-sm text-muted">{rate?.title ?? "Rate card item"}</p>
                      <p className="mt-1 text-sm">{formatMoney(b.amountCents)}</p>
                      {b.brief ? <p className="mt-2 text-sm text-muted">{b.brief}</p> : null}
                      {b.deliverableUrl ? (
                        <a
                          href={b.deliverableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-sm text-gold-deep hover:underline"
                        >
                          View deliverable
                        </a>
                      ) : null}
                    </div>
                    <p className="font-display text-xl tracking-tight">{formatMoney(b.amountCents)}</p>
                  </div>
                  {b.brief ? (
                    <p className="line-clamp-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
                      {b.brief}
                    </p>
                  ) : null}
                  {b.status === "in_progress" && b.revisionNote ? (
                    <p className="rounded-xl bg-gold-soft px-3 py-2 text-sm">
                      <span className="font-medium">Changes requested:</span> {b.revisionNote}
                    </p>
                  ) : null}
                  {b.deliverableUrl ? (
                    <a
                      href={b.deliverableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm font-medium text-gold-deep hover:underline"
                    >
                      View deliverable ↗
                    </a>
                  ) : null}
                  {b.status === "delivered" || b.status === "requested" ? (
                    <div className="border-t border-border/80 pt-3">
                      <BrandBookingActions bookingId={b.id} status={b.status} />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
