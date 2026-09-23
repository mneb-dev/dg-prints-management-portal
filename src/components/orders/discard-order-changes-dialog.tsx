import { TriangleAlertIcon } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"

export function DiscardOrderChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={TriangleAlertIcon}
      title="Discard your changes?"
      description="Your unsaved edits to this order will be lost."
      confirmLabel="Yes, discard"
      cancelLabel="No, keep editing"
      onConfirm={onDiscard}
    />
  )
}
