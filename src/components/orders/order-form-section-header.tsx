import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { IconBadge } from "@/components/icon-badge"
import { CardDescription, CardTitle } from "@/components/ui/card"

/** Order form section heading — the same IconBadge + title + one-line description treatment as
 * the dashboard card headers, so each section says what it's asking for at a glance. `title` can
 * be a node so the line item card can put its collapsed summary chips inline. */
export function OrderFormSectionHeader({
  icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <IconBadge icon={icon} size="sm" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <CardTitle className="flex min-w-0 items-center gap-2">{title}</CardTitle>
        {description ? <CardDescription className="truncate">{description}</CardDescription> : null}
      </div>
    </div>
  )
}
