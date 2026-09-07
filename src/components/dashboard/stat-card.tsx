import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const DEFAULT_ICON_CLASSNAME = "bg-muted text-foreground"
const DEFAULT_RING_CLASSNAME = "group-hover/statcard:ring-foreground/15"

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  iconClassName = DEFAULT_ICON_CLASSNAME,
  ringClassName = DEFAULT_RING_CLASSNAME,
  href,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  description?: string
  /** bg + text classes for the icon chip. Defaults to a neutral gray. */
  iconClassName?: string
  /** ring classes shown on hover (only visible when the card is clickable). Defaults to match `iconClassName`'s neutral gray. */
  ringClassName?: string
  href?: string
  onClick?: () => void
}) {
  const isClickable = Boolean(href || onClick)
  const card = (
    <Card
      size="sm"
      className={cn(
        "group/statcard transition-all",
        isClickable && cn("h-full hover:-translate-y-0.5 hover:shadow-md", ringClassName)
      )}
    >
      <CardContent className="flex items-center gap-3">
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
