import { TriangleAlertIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
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
    <AlertDialog open={!!order} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-status-warning/10 text-status-warning">
            <TriangleAlertIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Refund order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to refund order{" "}
            <span className="font-medium text-foreground">{order?.orderNumber}</span>? The order
            will be marked as refunded but kept in your records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => order && onConfirm(order)}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Refunding..." : "Refund Order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
