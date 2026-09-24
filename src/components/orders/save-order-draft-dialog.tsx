import { FileTextIcon } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"

export function SaveOrderDraftDialog({
  open,
  onOpenChange,
  onDiscard,
  onSaveDraft,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
  onSaveDraft: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={FileTextIcon}
      title="Leave without saving?"
      description="This order isn't created yet. Save it as a draft to pick up later, or discard it."
      confirmLabel="Discard"
      cancelLabel="Stay"
      secondaryAction={{ label: "Save draft", onClick: onSaveDraft }}
      onConfirm={onDiscard}
    />
  )
}
