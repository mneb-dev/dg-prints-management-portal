import { useState } from "react"
import { ArrowLeftIcon, FileWarningIcon } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog"
import { ORDER_STATUS_LABELS, OrderStatusBadge } from "@/components/orders/order-status-badge"
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import { RefundOrderDialog } from "@/components/orders/refund-order-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ORDER_STATUSES,
  canRefundOrder,
  getStatusFlowForCategory,
  isTerminalStatus,
  useOrders,
} from "@/lib/orders"
import type { Order, OrderStatus } from "@/lib/orders"
import { formatCurrency } from "@/lib/utils"

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { getOrder, setOrderStatus } = useOrders()
  const order = id ? getOrder(id) : undefined
  const [cancelling, setCancelling] = useState(false)
  const [refunding, setRefunding] = useState(false)

  if (!order) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileWarningIcon />
          </EmptyMedia>
          <EmptyTitle>Order not found</EmptyTitle>
          <EmptyDescription>This order may have been deleted.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const item = order.items[0]
  const statusOptions = item ? getStatusFlowForCategory(item.productCategory) : ORDER_STATUSES
  const canCancel = !isTerminalStatus(order.status)
  const canRefund = canRefundOrder(order.status, order.payment.status)

  function handleStatusChange(value: string | null) {
    if (!order || !value) return
    setOrderStatus(order.id, value as OrderStatus)
    toast.success("Status updated.")
  }

  function handleConfirmCancel(target: Order) {
    setOrderStatus(target.id, "cancelled")
    toast.success("Order cancelled.")
    setCancelling(false)
  }

  function handleConfirmRefund(target: Order) {
    setOrderStatus(target.id, "refunded")
    toast.success("Order refunded.")
    setRefunding(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link to="/orders" />}>
            <ArrowLeftIcon />
            <span className="sr-only">Back to Orders</span>
          </Button>
          <h1 className="text-2xl font-semibold">Order {order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!canCancel} onClick={() => setCancelling(true)}>
            Cancel
          </Button>
          <Button variant="outline" disabled={!canRefund} onClick={() => setRefunding(true)}>
            Refund
          </Button>
          <Button render={<Link to={`/orders/${order.id}/edit`} />}>Edit Order</Button>
        </div>
      </div>

      <CancelOrderDialog
        order={cancelling ? order : null}
        onOpenChange={(open) => !open && setCancelling(false)}
        onConfirm={handleConfirmCancel}
      />

      <RefundOrderDialog
        order={refunding ? order : null}
        onOpenChange={(open) => !open && setRefunding(false)}
        onConfirm={handleConfirmRefund}
      />

      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p>{order.customerName}</p>
          {order.customerPhone && (
            <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
          )}
        </CardContent>
      </Card>

      {item && (
        <Card>
          <CardHeader>
            <CardTitle>Product</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="font-medium">{item.productName}</p>

            {item.selectedOptions.map((option) => (
              <div key={option.optionId} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{option.optionName}</span>
                <span>{option.value}</span>
              </div>
            ))}

            {item.pricing.pricingType === "Package" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Package</span>
                <span>{item.pricing.packageName}</span>
              </div>
            )}

            {item.pricing.pricingType === "Package" && item.pricing.size && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Size</span>
                <span>
                  {item.pricing.size.width} × {item.pricing.size.height} {item.pricing.size.unit}
                </span>
              </div>
            )}
            {item.pricing.pricingType === "Per Unit" && item.pricing.width && item.pricing.height && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Size</span>
                <span>
                  {item.pricing.width} × {item.pricing.height} ft
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span>{item.quantity}</span>
            </div>

            {item.stickerQuotation && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sticker Quotation</span>
                <span>
                  {item.stickerQuotation.quantity} pcs + {item.stickerQuotation.free} pcs free
                </span>
              </div>
            )}

            {item.notes && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Notes</span>
                <span>{item.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {order.shippingAddress && (
        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span>{order.shippingAddress.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span>{order.shippingAddress.phone}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right">{order.shippingAddress.address}</span>
            </div>
            {order.shippingAddress.fee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping Fee</span>
                <span>{formatCurrency(order.shippingAddress.fee)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Additional Fees</span>
            <span>{formatCurrency(order.additionalFees)}</span>
          </div>
          {!!order.shippingAddress?.fee && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping Fee</span>
              <span>{formatCurrency(order.shippingAddress.fee)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span>{formatCurrency(order.discount)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-medium">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Channel</span>
            <span>{order.channel}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <PaymentStatusBadge status={order.payment.status} />
          </div>
          {order.payment.status !== "unpaid" && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Method</span>
                <span>{order.payment.method}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Down Payment</span>
                <span>{formatCurrency(order.payment.downPayment)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span>{formatCurrency(order.payment.balance)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={order.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue>
                {(value: string | null) => (value ? ORDER_STATUS_LABELS[value as OrderStatus] : "")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}
