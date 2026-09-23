import { RotateCcwIcon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { Order } from "@/lib/orders"

export function RefundOrderDialog({
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
      icon={RotateCcwIcon}
      title={<>Refund order <Name>{order?.orderNumber}</Name>?</>}
      description="It stays in your records, marked as refunded."
      confirmLabel="Yes, refund it"
      pendingLabel="Refunding…"
      cancelLabel="No, keep it"
      isPending={isPending}
      onConfirm={() => order && onConfirm(order)}
    />
  )
}
