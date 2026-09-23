import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type RecapItem = {
  label: string
  value: ReactNode
  /** The one figure the strip exists for (e.g. a total): larger and in the primary color. */
  emphasis?: boolean
}

/** Label/value cells in one bordered strip — the same look as PaymentRecap, for form summaries
 * like a recurring schedule's upcoming runs or a payroll total. */
export function RecapStrip({ items, className }: { items: RecapItem[]; className?: string }) {
  return (
    // gap-px over a border-colored background draws the dividers, so they stay correct when the
    // cells wrap to a second row on narrow screens (divide-x wouldn't).
    <dl
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-px overflow-hidden rounded-lg border bg-border",
        "animate-in duration-200 fade-in-0 motion-reduce:animate-none",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 bg-card px-3 py-2">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "leading-tight font-semibold tabular-nums",
              item.emphasis ? "text-base text-primary" : "text-sm"
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
