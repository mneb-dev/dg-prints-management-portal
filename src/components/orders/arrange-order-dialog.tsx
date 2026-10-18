import { CopyIcon, TruckIcon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
import { describeOrderItemFull, notedItems } from "@/lib/order-item-description"
import type { Order } from "@/lib/orders"
import { formatCurrency } from "@/lib/utils"

function CopyButton({ label, value }: { label: string; value: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`Copy ${label.toLowerCase()}`}
      className="text-muted-foreground hover:text-foreground"
      onClick={() => copyToClipboard(value)}
    >
      <CopyIcon />
    </Button>
  )
}

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
  // Same lines as the orders table's Product-column notes tooltip, shown inline.
  const withNotes = order ? notedItems(order.items) : []

  return (
    <ConfirmDialog
      open={!!order}
      onOpenChange={onOpenChange}
      tone="primary"
      icon={TruckIcon}
      title={
        <>
          Arrange shipment for <Name>{order?.orderNumber}</Name>?
        </>
      }
      description="Copy these into SPX."
      confirmLabel="Open SPX"
      cancelLabel="Later"
      confirmDisabled={!shipping}
      onConfirm={() => order && onConfirm(order)}
    >
      {shipping && (
        <div className="flex flex-col gap-2 text-sm">
          <div className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-1">
            <span className="text-muted-foreground">Name</span>
            <span className="text-right font-medium text-foreground">{shipping.name}</span>
            <CopyButton label="Name" value={shipping.name} />

            <span className="text-muted-foreground">Phone</span>
            <span className="text-right font-medium text-foreground">{shipping.phone}</span>
            <CopyButton label="Phone" value={shipping.phone} />

            <span className="text-muted-foreground">Address</span>
            <span className="text-right font-medium text-foreground">{shipping.address}</span>
            <CopyButton label="Address" value={shipping.address} />

            <span className="text-muted-foreground">Amount</span>
            <span className="text-right font-medium text-foreground">{formatCurrency(order!.total)}</span>
            <span />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end text-muted-foreground"
            onClick={() =>
              copyToClipboard(`${shipping.name}\n${shipping.phone}\n${shipping.address}`)
            }
          >
            <CopyIcon data-icon="inline-start" />
            Copy all
          </Button>
        </div>
      )}

      {withNotes.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-3">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {withNotes.map((noted) => {
              const full = describeOrderItemFull(noted)
              return (
                <div key={noted.id}>
                  <span className="font-medium text-foreground">{noted.productName}:</span>{" "}
                  {full.notes}
                  {full.size && ` (${full.size})`}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </ConfirmDialog>
  )
}
