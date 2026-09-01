import { useState } from "react"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CopyIcon,
  FileWarningIcon,
  Loader2Icon,
  PencilIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog"
import { ORDER_STATUS_LABELS, OrderStatusBadge } from "@/components/orders/order-status-badge"
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import { RefundOrderDialog } from "@/components/orders/refund-order-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import { copyToClipboard } from "@/lib/clipboard"
import { formatOrderSummaryText } from "@/lib/quote-text"
import { scaleQuotation } from "@/lib/sticker-quotation"
import {
  ORDER_STATUSES,
  canReleaseOrder,
  canRefundOrder,
  getStatusFlowForCategory,
  isReleaseLockedForRole,
  isTerminalStatus,
  useOrder,
  useOrderActions,
} from "@/lib/orders"
import type { Order, OrderItem, OrderStatus } from "@/lib/orders"
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils"

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { order, isLoading, isError, error } = useOrder(id)
  const { setOrderStatus } = useOrderActions()
  const { role } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [optimisticStatus, setOptimisticStatus] = useState<OrderStatus | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  if (isLoading) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Loader2Icon className="animate-spin" />
          </EmptyMedia>
          <EmptyTitle>Loading order…</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  if (isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Couldn't load order</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

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

  const items = order.items
  const firstItem = items[0]
  const statusOptions = firstItem ? getStatusFlowForCategory(firstItem.productCategory) : ORDER_STATUSES
  const isReleaseLocked = isReleaseLockedForRole(order.status, role)
  const canCancel = !isTerminalStatus(order.status) && !isReleaseLocked
  const canRefund = canRefundOrder(order.status, order.payment.status)
  const canRelease = canReleaseOrder(order.status, order.payment.status)
  const canEditOrder = !isReleaseLocked
  const displayStatus = optimisticStatus ?? order.status

  function itemQuotation(item: OrderItem) {
    return item.stickerQuotation ? scaleQuotation(item.stickerQuotation, item.quantity) : null
  }

  function itemInfoLines(item: OrderItem): string[] {
    const lines = [item.productName]

    for (const option of item.selectedOptions) {
      lines.push(`${option.optionName}: ${option.value}`)
    }

    if (item.pricing.pricingType === "Package") {
      lines.push(`Package: ${item.pricing.packageName}`)
      if (item.pricing.size) {
        lines.push(
          `Size: ${item.pricing.size.width} × ${item.pricing.size.height} ${item.pricing.size.unit}`
        )
      }
    }
    if (item.pricing.pricingType === "Per Unit" && item.pricing.width && item.pricing.height) {
      lines.push(`Size: ${item.pricing.width} × ${item.pricing.height} ft`)
    }
    if (item.pricing.pricingType === "Custom") {
      lines.push(`Custom Size: ${item.pricing.packageName}`)
      lines.push(`Size: ${item.pricing.width} × ${item.pricing.height} in`)
    }

    lines.push(`Quantity: ${item.quantity}`)

    const totalQuotation = itemQuotation(item)
    if (totalQuotation) {
      lines.push(
        `${item.productCategory} Quotation: ${totalQuotation.quantity} pcs` +
          (totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : "")
      )
    }

    if (item.notes) lines.push(`Notes: ${item.notes}`)

    return lines
  }

  function handleCopySummary() {
    if (items.length === 0 || !order) return

    const infoLines: string[] = []
    items.forEach((item, index) => {
      if (index > 0) infoLines.push("")
      if (items.length > 1) infoLines.push(`Item ${index + 1}:`)
      infoLines.push(...itemInfoLines(item))
    })

    copyToClipboard(
      formatOrderSummaryText({
        infoLines,
        subtotal: order.subtotal,
        additionalFees: order.additionalFees,
        layoutFee: order.layoutFee,
        shippingFee: order.shippingAddress?.fee ?? 0,
        discount: order.discount,
        total: order.total,
      })
    )
  }

  async function handleStatusChange(value: string | null) {
    if (!order || !value || value === order.status) return
    setOptimisticStatus(value as OrderStatus)
    setIsUpdatingStatus(true)
    try {
      await setOrderStatus(order.id, value as OrderStatus)
      toast.success("Status updated.")
    } catch (err) {
      setOptimisticStatus(null)
      toast.error(typeof err === "string" ? err : "Failed to update status.")
    } finally {
      setIsUpdatingStatus(false)
      setOptimisticStatus(null)
    }
  }

  async function handleConfirmCancel(target: Order) {
    setIsCancelling(true)
    try {
      await setOrderStatus(target.id, "cancelled")
      toast.success("Order cancelled.")
      setCancelling(false)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to cancel order.")
    } finally {
      setIsCancelling(false)
    }
  }

  async function handleConfirmRefund(target: Order) {
    setIsRefunding(true)
    try {
      await setOrderStatus(target.id, "refunded")
      toast.success("Order refunded.")
      setRefunding(false)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to refund order.")
    } finally {
      setIsRefunding(false)
    }
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
          <OrderStatusBadge key={displayStatus} status={displayStatus} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" disabled={!canCancel} onClick={() => setCancelling(true)}>
            <XCircleIcon data-icon="inline-start" />
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={!canRelease || isUpdatingStatus}
            onClick={() => handleStatusChange("released")}
          >
            <CheckCircle2Icon data-icon="inline-start" />
            Release
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" disabled={!canRefund} onClick={() => setRefunding(true)}>
            <RotateCcwIcon data-icon="inline-start" />
            Refund
          </Button>
          <Button disabled={!canEditOrder} render={<Link to={`/orders/${order.id}/edit`} />}>
            <PencilIcon data-icon="inline-start" />
            Edit Order
          </Button>
        </div>
      </div>

      <CancelOrderDialog
        order={cancelling ? order : null}
        isPending={isCancelling}
        onOpenChange={(open) => !open && setCancelling(false)}
        onConfirm={handleConfirmCancel}
      />

      <RefundOrderDialog
        order={refunding ? order : null}
        isPending={isRefunding}
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
          {order.description && (
            <p className="text-sm text-muted-foreground">{order.description}</p>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {items.map((orderItem, index) => {
              const totalQuotation = itemQuotation(orderItem)
              return (
                <div key={orderItem.id} className="flex flex-col gap-2">
                  <p className="font-medium">
                    {items.length > 1 ? `Item ${index + 1}: ${orderItem.productName}` : orderItem.productName}
                  </p>

                  {orderItem.selectedOptions.map((option) => (
                    <div key={option.optionId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{option.optionName}</span>
                      <span>{option.value}</span>
                    </div>
                  ))}

                  {orderItem.pricing.pricingType === "Package" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Package</span>
                      <span>{orderItem.pricing.packageName}</span>
                    </div>
                  )}

                  {orderItem.pricing.pricingType === "Package" && orderItem.pricing.size && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Size</span>
                      <span>
                        {orderItem.pricing.size.width} × {orderItem.pricing.size.height}{" "}
                        {orderItem.pricing.size.unit}
                      </span>
                    </div>
                  )}
                  {orderItem.pricing.pricingType === "Per Unit" &&
                    orderItem.pricing.width &&
                    orderItem.pricing.height && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Size</span>
                        <span>
                          {orderItem.pricing.width} × {orderItem.pricing.height} ft
                        </span>
                      </div>
                    )}

                  {orderItem.pricing.pricingType === "Custom" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Custom Size</span>
                      <span>{orderItem.pricing.packageName}</span>
                    </div>
                  )}
                  {orderItem.pricing.pricingType === "Custom" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Size</span>
                      <span>
                        {orderItem.pricing.width} × {orderItem.pricing.height} in
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span>{orderItem.quantity}</span>
                  </div>

                  {totalQuotation && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{orderItem.productCategory} Quotation</span>
                      <span>
                        {totalQuotation.quantity} pcs
                        {totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : ""}
                      </span>
                    </div>
                  )}

                  {orderItem.notes && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Notes</span>
                      <span>{orderItem.notes}</span>
                    </div>
                  )}

                  {index < items.length - 1 && <Separator />}
                </div>
              )
            })}
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
          {items.length > 0 && (
            <CardAction>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleCopySummary}
                aria-label="Copy order summary"
              >
                <CopyIcon />
              </Button>
            </CardAction>
          )}
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
          {order.layoutFee >= 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Layout Fee</span>
              <span>{formatCurrency(order.layoutFee)}</span>
            </div>
          )}
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
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Select
              value={displayStatus}
              onValueChange={handleStatusChange}
              disabled={isUpdatingStatus || isReleaseLocked}
            >
              <SelectTrigger className="w-48">
                <SelectValue>
                  {(value: string | null) => (value ? ORDER_STATUS_LABELS[value as OrderStatus] : "")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    disabled={
                      (status === "released" && !canRelease) ||
                      (status === "refunded" && !canRefund)
                    }
                  >
                    {ORDER_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isUpdatingStatus && (
              <Loader2Icon className="size-4 animate-spin text-muted-foreground animate-in fade-in-0 duration-200" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Created by{" "}
            <span >{order.createdByName || "Unknown user"}</span>{" "}
            {" "}
            <Tooltip>
              <TooltipTrigger className="font-medium text-foreground">
                {formatRelativeDate(order.createdAt)}
              </TooltipTrigger>
              <TooltipContent >{formatDate(order.createdAt)}</TooltipContent>
            </Tooltip>
          </p>
          {order.statusUpdatedAt && (
            <p className="text-sm text-muted-foreground">
              Status updated by{" "}
              <span >{order.statusUpdatedByName || "Unknown user"}</span>{" "}
              {" "}
              <Tooltip>
                <TooltipTrigger className="font-medium text-foreground">
                  {formatRelativeDate(order.statusUpdatedAt)}
                </TooltipTrigger>
                <TooltipContent>{formatDate(order.statusUpdatedAt)}</TooltipContent>
              </Tooltip>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
