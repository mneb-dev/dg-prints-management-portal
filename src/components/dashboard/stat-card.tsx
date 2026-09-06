import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TONE_CLASSES = {
  secondary: "bg-muted text-foreground",
  info: "bg-status-info/10 text-status-info",
  progress: "bg-status-progress/10 text-status-progress",
  ready: "bg-status-ready/10 text-status-ready",
  success: "bg-status-success/10 text-status-success",
  warning: "bg-status-warning/10 text-status-warning",
  destructive: "bg-destructive/10 text-destructive",
} as const

const TONE_RING_CLASSES = {
  secondary: "group-hover/statcard:ring-foreground/15",
  info: "group-hover/statcard:ring-status-info/30",
  progress: "group-hover/statcard:ring-status-progress/30",
  ready: "group-hover/statcard:ring-status-ready/30",
  success: "group-hover/statcard:ring-status-success/30",
  warning: "group-hover/statcard:ring-status-warning/30",
  destructive: "group-hover/statcard:ring-destructive/30",
} as const

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "secondary",
  href,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  description?: string
  tone?: keyof typeof TONE_CLASSES
  href?: string
  onClick?: () => void
}) {
  const isClickable = Boolean(href || onClick)
  const card = (
    <Card
      size="sm"
      className={cn(
        "group/statcard transition-all",
        isClickable && cn("h-full hover:-translate-y-0.5 hover:shadow-md", TONE_RING_CLASSES[tone])
      )}
    >
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover/statcard:scale-105",
            TONE_CLASSES[tone]
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
