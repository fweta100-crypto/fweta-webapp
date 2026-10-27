import { cn, formatMoney } from "@/lib/utils";

export function BudgetBar({
  spentCents,
  totalCents,
  className,
}: {
  spentCents: number;
  totalCents: number;
  className?: string;
}) {
  const pct = totalCents ? Math.min(100, Math.round((spentCents / totalCents) * 100)) : 0;
  return (
    <div className={cn("w-full", className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full", pct >= 80 ? "bg-danger" : "bg-gold")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {formatMoney(spentCents)} of {formatMoney(totalCents)} spent · {pct}%
      </p>
    </div>
  );
}
