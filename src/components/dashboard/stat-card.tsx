import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TONE_CLASSES = {
  default: "bg-muted text-foreground",
  warning: "bg-status-warning/10 text-status-warning",
  destructive: "bg-destructive/10 text-destructive",
} as const

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "default",
  href,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  description?: string
  tone?: keyof typeof TONE_CLASSES
  href?: string
}) {
  const card = (
    <Card size="sm" className={cn(href && "h-full transition-colors hover:bg-muted/40")}>
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            TONE_CLASSES[tone]
          )}
        >
          <Icon className="size-4.5" />
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

  return href ? (
    <Link to={href} className="block">
      {card}
    </Link>
  ) : (
    card
  )
}
