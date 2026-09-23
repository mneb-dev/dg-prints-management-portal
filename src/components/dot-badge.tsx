import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Neutral chip + colored dot — the app's standard status chip (docs/design-system.md): the chrome
 * stays neutral and only the dot carries the status color. */
export function DotBadge({
  dotClassName,
  children,
  className,
}: {
  /** Solid bg class for the dot, e.g. `bg-order-status-teal`. */
  dotClassName: string
  children: ReactNode
  className?: string
}) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <span aria-hidden className={cn("size-2 shrink-0 translate-y-px rounded-full", dotClassName)} />
      <span className="leading-none">{children}</span>
    </Badge>
  )
}
