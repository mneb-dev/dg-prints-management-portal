import { TruckIcon } from "lucide-react"

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
import type { Order } from "@/lib/orders"

export function ArrangeOrderDialog({
  order,
  onOpenChange,
  onConfirm,
}: {
  order: Order | null
  onOpenChange: (open: boolean) => void
  onConfirm: (order: Order) => void
}) {
  const shipping = order?.shippingAddress ?? null

  return (
    <AlertDialog open={!!order} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TruckIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Arrange shipment</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm the shipping details for order{" "}
            <span className="font-medium text-foreground">{order?.orderNumber}</span> before
            arranging. They'll be copied and SPX will open in a new tab.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {shipping && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Name</span>
              <span className="text-right font-medium text-foreground">{shipping.name}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span className="text-right font-medium text-foreground">{shipping.phone}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Address</span>
              <span className="text-right font-medium text-foreground">{shipping.address}</span>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={!shipping} onClick={() => order && onConfirm(order)}>
            Arrange
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
