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

export function DeleteOrderDialog({
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
          <AlertDialogTitle>Delete order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete order{" "}
            <span className="font-medium text-foreground">{order?.orderNumber}</span>? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => order && onConfirm(order)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
