import { cn, formatCurrency } from "@/lib/utils"

/** Total / Paid / Balance at a glance — shared by the order form's Payment section (live, as the
 * user fills it in) and the View Order page (the stored values). The balance reads gold while
 * money is still owed and teal "Fully paid" at ₱0, echoing the Unpaid/Paid status dots; a
 * refunded order shows a single muted line instead. */
export function PaymentRecap({
  total,
  paid,
  balance,
  isRefunded = false,
  className,
}: {
  total: number
  paid: number
  balance: number
  isRefunded?: boolean
  className?: string
}) {
  if (isRefunded) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Refunded — no balance due.</p>
  }

  return (
    // gap-px over a border-colored background draws the dividers, so they stay correct when the
    // cells wrap to a second row on narrow screens (divide-x wouldn't).
    <dl
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-px overflow-hidden rounded-lg border bg-border",
        className
      )}
    >
      <RecapCell label="Total" value={formatCurrency(total)} />
      <RecapCell label="Paid" value={formatCurrency(paid)} />
      <RecapCell
        label="Balance"
        value={balance > 0 ? formatCurrency(balance) : "Fully paid"}
        valueClassName={balance > 0 ? "text-order-status-gold" : "text-order-status-teal"}
      />
    </dl>
  )
}

function RecapCell({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm leading-tight font-semibold whitespace-nowrap tabular-nums", valueClassName)}>
        {value}
      </dd>
    </div>
  )
}
