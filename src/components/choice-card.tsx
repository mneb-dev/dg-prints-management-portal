import type { ReactNode } from "react"
import { CheckIcon, type LucideIcon } from "lucide-react"

import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

/** Large selectable card for a one-of-a-few decision (product pricing mode, calculator
 * category). Use inside a `ToggleGroup`. Same "selected" language as `ChoiceTile` — primary
 * border, soft accent wash, a ✓ — just roomier, with an icon tile, title and one-line hint.
 * Pass `icon` for a plain icon tile, or `media` for custom artwork (e.g. a category icon). */
export function ChoiceCard({
  value,
  icon: Icon,
  media,
  title,
  description,
  className,
}: {
  value: string
  icon?: LucideIcon
  media?: ReactNode
  title: string
  description?: string
  className?: string
}) {
  return (
    <Toggle
      value={value}
      className={cn(
        "group/choice relative h-auto items-start justify-start gap-3 rounded-xl border bg-card p-3.5 text-left whitespace-normal hover:bg-accent/30 data-[pressed]:border-primary data-[pressed]:bg-accent/50 data-[pressed]:text-foreground data-[pressed]:hover:bg-accent/50 dark:data-[pressed]:bg-accent/50",
        className
      )}
    >
      {media ?? (
        Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-data-[pressed]/choice:bg-primary group-data-[pressed]/choice:text-primary-foreground">
            <Icon className="size-4" />
          </span>
        )
      )}
      <span className="flex min-w-0 flex-col gap-0.5 pr-5">
        <span className="text-sm font-semibold">{title}</span>
        {description ? <span className="text-xs font-normal text-muted-foreground">{description}</span> : null}
      </span>
      <CheckIcon
        aria-hidden
        className="absolute top-3 right-3 hidden size-4 stroke-3 text-primary group-data-[pressed]/choice:block"
      />
    </Toggle>
  )
}
