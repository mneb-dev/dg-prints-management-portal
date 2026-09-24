import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    // Phones stack the actions under the title (and let them wrap) instead of squeezing the title.
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate font-heading text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground sm:truncate">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">{actions}</div>
      ) : null}
    </div>
  )
}
