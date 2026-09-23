import { Fragment } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useOrderStatusLookup } from "@/lib/order-statuses"
import { cn } from "@/lib/utils"

/** A category's order workflow as a compact dot path — one dot per status in that status's own
 * color, joined by hairlines (neutral chrome + dot, per docs/design-system.md). `showLabels`
 * spells the steps out underneath (the category form's live preview); otherwise the full
 * "Pending → … → Released" text lives in a tooltip (the categories table). */
export function StatusFlowPath({
  statuses,
  showLabels = false,
  className,
}: {
  statuses: string[]
  showLabels?: boolean
  className?: string
}) {
  const { getLabel, getColors } = useOrderStatusLookup()
  const summary = statuses.map((status) => getLabel(status)).join(" → ")

  if (showLabels) {
    return (
      <ol aria-label={summary} className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs", className)}>
        {statuses.map((status, index) => (
          <Fragment key={status}>
            {index > 0 && <li aria-hidden className="h-px w-3 bg-border" />}
            <li className="flex animate-in items-center gap-1.5 rounded-full border bg-card px-2 py-1 duration-200 fade-in-0 zoom-in-95 motion-reduce:animate-none">
              <span
                aria-hidden
                className={cn("size-2 shrink-0 translate-y-px rounded-full", getColors(status).solid)}
              />
              <span className="leading-none">{getLabel(status)}</span>
            </li>
          </Fragment>
        ))}
      </ol>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span role="img" aria-label={summary} className={cn("inline-flex items-center gap-2", className)} />}
      >
        <span aria-hidden className="flex items-center">
          {statuses.map((status, index) => (
            <Fragment key={status}>
              {index > 0 && <span className="h-px w-2.5 bg-border" />}
              <span className={cn("size-2 shrink-0 rounded-full", getColors(status).solid)} />
            </Fragment>
          ))}
        </span>
        <span aria-hidden className="text-xs text-muted-foreground tabular-nums">
          {statuses.length} {statuses.length === 1 ? "step" : "steps"}
        </span>
      </TooltipTrigger>
      <TooltipContent>{summary}</TooltipContent>
    </Tooltip>
  )
}
