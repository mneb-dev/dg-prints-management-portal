import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const DEFAULT_ICON_CLASSNAME = "bg-accent text-accent-foreground"
const DEFAULT_DOT_CLASSNAME = "bg-muted-foreground"
const DEFAULT_DOT_RING_CLASSNAME = "group-hover/statcard:ring-foreground/15"

/** Clickable-tile hover, per the Corporate Trust recipe: neutral chrome with a brand (indigo)
 * border tint on top of Card's lift + `--shadow-elevated`, a press state, and a keyboard focus
 * ring. Focus/active are keyed off the wrapping Link/button (`group/stattrigger`). */
const CLICKABLE_CLASSNAME = cn(
  // Tailwind v4 translate/scale utilities set the `translate`/`scale` properties, not
  // `transform`, so those must be listed explicitly for the lift to animate.
  "h-full duration-200 ease-out transition-[translate,scale,box-shadow,border-color,background-color]",
  "hover:-translate-y-1 hover:border-primary/40 hover:bg-accent/60 hover:shadow-[var(--shadow-elevated)]",
  "group-active/stattrigger:translate-y-0 group-active/stattrigger:scale-[0.98] group-active/stattrigger:shadow-[var(--shadow-soft)]",
  "group-focus-visible/stattrigger:border-ring group-focus-visible/stattrigger:ring-3 group-focus-visible/stattrigger:ring-ring/50",
  // Reduced motion: drop the movement only — the color/shadow feedback stays.
  "motion-reduce:hover:translate-y-0 motion-reduce:group-active/stattrigger:scale-100"
)

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  iconClassName = DEFAULT_ICON_CLASSNAME,
  dotClassName = DEFAULT_DOT_CLASSNAME,
  dotRingClassName = DEFAULT_DOT_RING_CLASSNAME,
  href,
  onClick,
}: {
  /** Omit for a minimal, icon-free tile — label + value, with a small color dot (see
   * `dotClassName`). */
  icon?: LucideIcon
  label: string
  value: ReactNode
  description?: string
  /** bg + text classes for the icon chip. Defaults to a soft brand tint. Ignored when `icon`
   * is omitted. */
  iconClassName?: string
  /** Solid bg class for the minimal dot indicator, shown when `icon` is omitted. */
  dotClassName?: string
  /** `group-hover/statcard:ring-*` class for the dot's hover halo — the status's `ring` color,
   * so the tile chrome stays neutral/brand and only the dot carries the status color. */
  dotRingClassName?: string
  href?: string
  onClick?: () => void
}) {
  const isClickable = Boolean(href || onClick)
  const card = (
    <Card size="sm" interactive={isClickable} className={cn("group/statcard", isClickable && CLICKABLE_CLASSNAME)}>
      {Icon ? (
        <CardContent className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover/statcard:scale-105",
              iconClassName
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-2xl leading-tight font-semibold tabular-nums">{value}</span>
            <span className="truncate text-sm text-muted-foreground">{label}</span>
          </div>
        </CardContent>
      ) : (
        <CardContent className="flex flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                "size-2 shrink-0 translate-y-px rounded-full ring-0 transition-[scale,box-shadow] duration-200 group-hover/statcard:scale-125 group-hover/statcard:ring-4 motion-reduce:group-hover/statcard:scale-100",
                dotClassName,
                dotRingClassName
              )}
            />
            <span className="truncate text-xs leading-none font-medium tracking-wide text-muted-foreground uppercase transition-colors duration-200 group-hover/statcard:text-foreground">
              {label}
            </span>
          </div>
          <span className="text-2xl leading-none font-bold tabular-nums">{value}</span>
        </CardContent>
      )}
      {description ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">{description}</CardContent>
      ) : null}
    </Card>
  )

  if (href) {
    return (
      <Link to={href} className="group/stattrigger block rounded-xl outline-none">
        {card}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="group/stattrigger block w-full cursor-pointer rounded-xl text-left outline-none">
        {card}
      </button>
    )
  }

  return card
}
