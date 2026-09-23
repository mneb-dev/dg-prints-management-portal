import { Trash2Icon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { Order } from "@/lib/orders"

export function DeleteOrderDialog({
  order,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  order: Order | null
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (order: Order) => void
}) {
  return (
    <ConfirmDialog
      open={!!order}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={Trash2Icon}
      title={<>Delete order <Name>{order?.orderNumber}</Name>?</>}
      description={"This can't be undone."}
      confirmLabel="Yes, delete it"
      pendingLabel="Deleting…"
      isPending={isDeleting}
      onConfirm={() => order && onConfirm(order)}
    />
  )
}
