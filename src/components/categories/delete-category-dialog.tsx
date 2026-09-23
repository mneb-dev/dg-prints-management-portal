import { Trash2Icon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { Category } from "@/lib/categories"

export function DeleteCategoryDialog({
  category,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  category: Category | null
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (category: Category) => void
}) {
  return (
    <ConfirmDialog
      open={!!category}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={Trash2Icon}
      title={<>Delete category <Name>{category?.name}</Name>?</>}
      description={"This can't be undone. If products still use it, deleting is blocked — deactivate it instead."}
      confirmLabel="Yes, delete it"
      pendingLabel="Deleting…"
      isPending={isDeleting}
      onConfirm={() => category && onConfirm(category)}
    />
  )
}
