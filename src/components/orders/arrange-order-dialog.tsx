import { CopyIcon, TruckIcon } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
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
            Order <span className="font-medium text-foreground">{order?.orderNumber}</span> — SPX
            opens in a new tab.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {shipping && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Name</span>
                <div className="flex items-center gap-0.5">
                  <span className="font-medium text-foreground">{shipping.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Copy name"
                    onClick={() => copyToClipboard(shipping.name)}
                  >
                    <CopyIcon />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Phone</span>
                <div className="flex items-center gap-0.5">
                  <span className="font-medium text-foreground">{shipping.phone}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Copy phone"
                    onClick={() => copyToClipboard(shipping.phone)}
                  >
                    <CopyIcon />
                  </Button>
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-muted-foreground">Address</span>
                <div className="flex items-start gap-0.5">
                  <span className="text-right font-medium text-foreground">
                    {shipping.address}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Copy address"
                    onClick={() => copyToClipboard(shipping.address)}
                  >
                    <CopyIcon />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                copyToClipboard(`${shipping.name}\n${shipping.phone}\n${shipping.address}`)
              }
            >
              <CopyIcon data-icon="inline-start" />
              Copy all
            </Button>
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
