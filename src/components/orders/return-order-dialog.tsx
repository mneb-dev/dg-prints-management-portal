import { Undo2Icon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { Order } from "@/lib/orders"

export function ReturnOrderDialog({
  order,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  order: Order | null
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (order: Order) => void
}) {
  return (
    <ConfirmDialog
      open={!!order}
      onOpenChange={onOpenChange}
      tone="warning"
      icon={Undo2Icon}
      title={<>Mark order <Name>{order?.orderNumber}</Name> as returned?</>}
      description="It stays in your records, marked as returned."
      confirmLabel="Yes, mark returned"
      pendingLabel="Saving…"
      cancelLabel="No, go back"
      isPending={isPending}
      onConfirm={() => order && onConfirm(order)}
    />
  )
}
