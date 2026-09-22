import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const DEFAULT_ICON_CLASSNAME = "bg-accent text-accent-foreground"
const DEFAULT_DOT_CLASSNAME = "bg-muted-foreground"

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  iconClassName = DEFAULT_ICON_CLASSNAME,
  dotClassName = DEFAULT_DOT_CLASSNAME,
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
  href?: string
  onClick?: () => void
}) {
  const isClickable = Boolean(href || onClick)
  const card = (
    <Card size="sm" interactive={isClickable} className={cn("group/statcard", isClickable && "h-full")}>
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
                "size-2 shrink-0 translate-y-px rounded-full transition-transform group-hover/statcard:scale-125",
                dotClassName
              )}
            />
            <span className="truncate text-xs leading-none font-medium tracking-wide text-muted-foreground uppercase">
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
      <Link to={href} className="block">
        {card}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full cursor-pointer text-left">
        {card}
      </button>
    )
  }

  return card
}
