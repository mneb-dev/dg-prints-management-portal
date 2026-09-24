import { XCircleIcon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { Order } from "@/lib/orders"

export function CancelOrderDialog({
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
      tone="danger"
      icon={XCircleIcon}
      title={<>Cancel order <Name>{order?.orderNumber}</Name>?</>}
      description="It stays in your records, marked as cancelled."
      confirmLabel="Cancel order"
      pendingLabel="Cancelling…"
      isPending={isPending}
      onConfirm={() => order && onConfirm(order)}
    />
  )
}
