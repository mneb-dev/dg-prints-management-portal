import { cn } from "@/lib/utils"

/** "12/60" under a length-limited field, so the limit is visible before it's hit. Turns gold at
 * 80% of the limit and red at the limit; only announced to screen readers once it's getting close,
 * so it doesn't chatter on every keystroke. */
export function CharCount({ value, max, className }: { value: string; max: number; className?: string }) {
  const count = value.length
  const isNear = count >= max * 0.8
  const isAtLimit = count >= max
  return (
    <span
      aria-live={isNear ? "polite" : "off"}
      className={cn(
        "ml-auto text-xs text-muted-foreground tabular-nums transition-colors",
        isNear && "text-order-status-gold",
        isAtLimit && "text-destructive",
        className
      )}
    >
      {count}/{max}
      <span className="sr-only"> characters used</span>
    </span>
  )
}
