import { Check, Handshake, Megaphone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listBrandCampaigns } from "@/app/actions/campaigns";
import { listBrandBookings } from "@/app/actions/bookings";
import { getMyWallet } from "@/app/actions/wallet";
import { BudgetBar } from "@/components/ui/budget-bar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, SectionHeader, Stat, StatGrid } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSession } from "@/lib/auth/session";
import { bookingKind } from "@/lib/bookings/kind";
import { formatMoney } from "@/lib/utils";
import { readStore } from "@/lib/db/store";

export default async function BrandDashboardPage() {
  const session = await getSession();
  if (!session?.roles.includes("brand") && !session?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const [campaigns, bookings, wallet, store] = await Promise.all([
    listBrandCampaigns(),
    listBrandBookings(),
    getMyWallet(),
    readStore(),
  ]);

  const active = campaigns.filter((c) => c.status === "active").length;
  const spent = campaigns.reduce((s, c) => s + c.budgetSpentCents, 0);
  const pendingSubs = store.submissions.filter((s) =>
    campaigns.some((c) => c.id === s.campaignId && s.status === "pending"),
  ).length;
  const awaitingApproval = bookings.filter((b) => b.status === "delivered").length;
  const depositsPending = store.brandDeposits.filter(
    (d) => d.brandId === session.id && d.status === "pending",
  ).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const todos: { label: string; href: string; cta: string }[] = [];
  if (pendingSubs > 0) {
    todos.push({
      label: `${plural(pendingSubs, "clip is", "clips are")} waiting for your review`,
      href: "/dashboard/brand/submissions",
      cta: "Review",
    });
  }
  if (awaitingApproval > 0) {
    todos.push({
      label: `${plural(awaitingApproval, "booking was", "bookings were")} delivered — approve or request changes`,
      href: "/dashboard/brand/bookings",
      cta: "Open",
    });
  }
  if (depositsPending > 0) {
    todos.push({
      label: `${plural(depositsPending, "deposit is", "deposits are")} waiting for an admin to credit`,
      href: "/dashboard/brand/deposits",
      cta: "View",
    });
  }
  const isNew = campaigns.length === 0 && bookings.length === 0;
  const hasFunds = wallet.availableCents > 0;
  const steps = [
    {
      title: "Fund your wallet",
      body: depositsPending
        ? "Deposit recorded — waiting for an admin to credit it."
        : "Send an EFT and record it so an admin can credit your wallet.",
      href: "/dashboard/brand/deposits",
      cta: "Record deposit",
      done: hasFunds,
    },
    {
      title: "Launch a campaign",
      body: "Set a budget and pay-per-view rate. Creators clip and post your content.",
      href: "/dashboard/brand/campaigns/new",
      cta: "New campaign",
      done: false,
    },
    {
      title: "Or hire an influencer",
      body: "Book from a rate card or send a private offer for a sponsored post.",
      href: "/influencers",
      cta: "Browse influencers",
      done: false,
    },
  ];

  return (
    <div className="dash-stack">
      <PageHeader
        title="Brand overview"
        description={
          isNew
            ? "Welcome to fweta. Three steps to your first campaign."
            : "Your campaigns, clips, and bookings at a glance."
        }
        action={
          <Link href="/dashboard/brand/campaigns/new">
            <Button size="sm">New campaign</Button>
          </Link>
        }
      />

      {isNew ? (
        <Card>
          <h2 className="font-display text-2xl tracking-tight">Get started</h2>
          <p className="mt-1 text-sm text-muted">
            Wallet: <span className="font-medium text-foreground">{formatMoney(wallet.availableCents)}</span>
          </p>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex flex-col rounded-2xl border border-border bg-white p-4">
                <span
                  className={
                    step.done
                      ? "flex size-7 items-center justify-center rounded-full bg-success-soft text-success"
                      : "flex size-7 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-gold-deep"
                  }
                >
                  {step.done ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <p className="mt-3 font-medium">{step.title}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{step.body}</p>
                {step.done ? null : (
                  <Link href={step.href} className="mt-4">
                    <Button size="sm" variant={i === 0 && !hasFunds ? "primary" : "secondary"}>
                      {step.cta}
                    </Button>
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {isNew ? null : (
        <StatGrid>
          <Stat label="Active campaigns" value={String(active)} />
          <Stat label="Budget spent" value={formatMoney(spent)} />
          <Stat label="Pending reviews" value={String(pendingSubs)} />
          <Stat
            label="Wallet"
            value={formatMoney(wallet.availableCents)}
            hint={
              wallet.pendingCents > 0
                ? `${formatMoney(wallet.pendingCents)} held for bookings`
                : "Available to spend"
            }
          />
        </StatGrid>
      )}

      {todos.length > 0 ? (
        <section>
          <SectionHeader title="Needs your attention" />
          <ul className="space-y-2.5">
            {todos.map((t) => (
              <li key={t.href + t.label}>
                <Link href={t.href} className="list-row">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-2 shrink-0 rounded-full bg-gold" />
                    <p className="text-sm font-medium">{t.label}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gold-deep">{t.cta} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isNew ? null : (
        <div className="dash-split">
          <section>
            <SectionHeader title="Recent campaigns" href="/dashboard/brand/campaigns" />
            {campaigns.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Launch a clipping or UGC campaign and invite creators to distribute for you."
                action={
                  <Link href="/dashboard/brand/campaigns/new">
                    <Button size="sm">Create campaign</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {campaigns.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/brand/campaigns/${c.id}`} className="list-row">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{c.title}</p>
                          <StatusBadge status={c.status} />
                        </div>
                        <BudgetBar spentCents={c.budgetSpentCents} totalCents={c.budgetTotalCents} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader title="Bookings" href="/dashboard/brand/bookings" linkLabel="All bookings →" />
            {bookings.length === 0 ? (
              <EmptyState
                icon={Handshake}
                title="No bookings yet"
                description="Hire influencers at their listed rates for trusted sponsored posts."
                action={
                  <Link href="/influencers">
                    <Button size="sm" variant="secondary">
                      Browse influencers
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {bookings.slice(0, 5).map((b) => {
                  const influencer = store.influencerProfiles.find(
                    (p) => p.id === b.influencerProfileId,
                  );
                  return (
                    <li key={b.id}>
                      <Link href="/dashboard/brand/bookings" className="list-row">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {influencer?.displayName ?? "Influencer"}
                            {bookingKind(b) === "private" ? " · Private offer" : ""}
                          </p>
                          <p className="text-xs text-muted">{formatMoney(b.amountCents)}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
