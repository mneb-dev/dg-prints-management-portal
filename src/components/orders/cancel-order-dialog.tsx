import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Order } from "@/lib/orders"

export function CancelOrderDialog({
  order,
  onOpenChange,
  onConfirm,
}: {
  order: Order | null
  onOpenChange: (open: boolean) => void
  onConfirm: (order: Order) => void
}) {
  return (
    <AlertDialog open={!!order} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel order{" "}
            <span className="font-medium text-foreground">{order?.orderNumber}</span>? The order
            will be marked as cancelled but kept in your records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => order && onConfirm(order)}
          >
            Cancel Order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
