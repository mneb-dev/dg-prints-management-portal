import { ArrowRightIcon, WalletIcon, XIcon } from "lucide-react"

import { IconBadge } from "@/components/icon-badge"
import { Button } from "@/components/ui/button"
import { useOrderStats } from "@/lib/orders"
import { cn, daysSince, formatCurrency } from "@/lib/utils"

function plural(count: number, one: string, many: string) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`
}

/** Header banner on the Orders page that nags staff about partially paid orders (deposit taken,
 * balance still owed) so they follow up with the customer. Not dismissible on purpose. Hidden when
 * there are none. `isFiltered` = the list is already showing just partially paid orders. */
export function PartialPaymentsBanner({
  isFiltered,
  onShow,
  onShowAll,
}: {
  isFiltered: boolean
  onShow: () => void
  onShowAll: () => void
}) {
  const { stats } = useOrderStats()
  const summary = stats?.partialPayments
  const count = summary?.count ?? stats?.byPaymentStatus.partially_paid ?? 0

  // Keep the last numbers on screen while stats refetch after a payment change (no flash).
  if (!stats || count === 0) return null

  if (isFiltered) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-l-4 border-l-order-status-gold bg-order-status-gold/10 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing <span className="font-semibold">{plural(count, "partially paid order", "partially paid orders")}</span>{" "}
          — oldest first. Message each customer about their remaining balance.
        </span>
        <Button variant="outline" size="sm" onClick={onShowAll} className="self-start sm:self-auto">
          <XIcon data-icon="inline-start" />
          Show all orders
        </Button>
      </div>
    )
  }

  const oldestDays = daysSince(summary?.oldestAt ?? null)
  const details = summary
    ? [
        `${formatCurrency(summary.balance)} left to collect`,
        oldestDays > 0 ? `oldest is ${plural(oldestDays, "day", "days")} old` : null,
        summary.over7d > 0 ? `${summary.over7d.toLocaleString()} waiting over a week` : null,
      ].filter(Boolean)
    : ["Customers paid a deposit but still owe the rest."]

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-l-4 border-l-order-status-gold bg-order-status-gold/10 p-4 shadow-[var(--shadow-button)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative shrink-0">
          <IconBadge icon={WalletIcon} size="md" className="bg-order-status-gold text-white" />
          <span className="absolute -top-0.5 -right-0.5 flex size-3" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-order-status-gold opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-order-status-gold" />
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-semibold">
            {plural(count, "order still has", "orders still have")} a balance to collect
          </p>
          <p className="text-sm text-muted-foreground">
            {details.map((part, index) => (
              <span key={index} className={cn(index === 0 && summary && "font-medium text-foreground tabular-nums")}>
                {index > 0 ? " · " : null}
                {part}
              </span>
            ))}
          </p>
        </div>
      </div>
      <Button onClick={onShow} className="w-full shrink-0 sm:w-auto">
        Follow up now
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
    </div>
  )
}
