import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { IconBadge } from "@/components/icon-badge"
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** Standard heading for form dialogs — the same IconBadge + title + one-line description as the
 * app's section/card headers, so every modal opens the same way (docs/design-system.md → Modals). */
export function FormDialogHeader({
  icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
}) {
  return (
    <DialogHeader className="flex-row items-start gap-3">
      <IconBadge icon={icon} size="md" className="rounded-full" />
      <div className="flex min-w-0 flex-col gap-1 pt-0.5">
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription className="text-pretty">{description}</DialogDescription> : null}
      </div>
    </DialogHeader>
  )
}
