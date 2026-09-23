import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MASKED_AMOUNT } from "@/lib/sales-visibility"
import { cn, formatCurrency } from "@/lib/utils"

/** A peso amount that respects the top bar's "hide amounts" toggle. Shown: the formatted value.
 * Hidden: a muted, spaced-out ₱•••• that clearly reads as "hidden" (not as a real figure), with a
 * hover hint on how to reveal it. Both states fade in on toggle so the switch doesn't jump.
 * For places that need a plain string (chart axis ticks), use MASKED_AMOUNT directly. */
export function Money({
  amount,
  hidden,
  format = formatCurrency,
  className,
}: {
  amount: number
  hidden: boolean
  /** Defaults to the full ₱1,234.00 format; pass e.g. a compact formatter for tight spots. */
  format?: (amount: number) => string
  className?: string
}) {
  if (!hidden) {
    return (
      <span
        key="shown"
        className={cn("animate-in tabular-nums duration-200 fade-in-0 motion-reduce:animate-none", className)}
      >
        {format(amount)}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            key="hidden"
            role="img"
            aria-label="Amount hidden"
            className={cn(
              "inline-block animate-in cursor-default tracking-[0.12em] text-muted-foreground/80 select-none duration-200 fade-in-0 motion-reduce:animate-none",
              className
            )}
          />
        }
      >
        {MASKED_AMOUNT}
      </TooltipTrigger>
      <TooltipContent>Amount hidden. Press Alt+H or use the eye in the top bar to show it.</TooltipContent>
    </Tooltip>
  )
}
