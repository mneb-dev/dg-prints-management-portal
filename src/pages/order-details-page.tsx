import { useState } from "react"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  FileWarningIcon,
  PencilIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog"
import { OrderItemSummary } from "@/components/orders/order-item-summary"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { OrderStatusMenu } from "@/components/orders/order-status-menu"
import { OrderStatusStepper } from "@/components/orders/order-status-stepper"
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import { PaymentStatusMenu } from "@/components/orders/payment-status-menu"
import { RecordPaymentDialog } from "@/components/orders/record-payment-dialog"
import { RefundOrderDialog } from "@/components/orders/refund-order-dialog"
import { ReturnOrderDialog } from "@/components/orders/return-order-dialog"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import { useCategories } from "@/lib/categories"
import { copyToClipboard, SPX_ADMIN_CREATE_ORDER_URL } from "@/lib/clipboard"
import { buildCopyableOrderText, buildLineItemInfoLines, formatOrderSummaryText } from "@/lib/quote-text"
import {
  getOrderStatusOptions,
  isReleaseLockedForRole,
  isTerminalStatus,
  useOrder,
  useOrderActions,
  useOrderStatusUpdate,
} from "@/lib/orders"
import type { Order, OrderStatus, Payment } from "@/lib/orders"
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils"

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { order, isLoading, isError, error } = useOrder(id)
  const { setOrderStatus, updateOrder } = useOrderActions()
  const { updateStatus, isUpdating: isUpdatingStatus } = useOrderStatusUpdate()
  const { role, hasPermission } = useAuth()
  const canManage = hasPermission("manage_orders")
  const { categories } = useCategories()
  const [cancelling, setCancelling] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [returning, setReturning] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [optimisticStatus, setOptimisticStatus] = useState<OrderStatus | null>(null)
  const [payingTargetStatus, setPayingTargetStatus] = useState<"paid" | "partially_paid" | null>(null)
  const [isPaying, setIsPaying] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center gap-3">
            {Array.from({ length: 4 }).flatMap((_, index) => [
              <Skeleton key={`chip-${index}`} className="size-9 shrink-0 rounded-full" />,
              index < 3 && <Skeleton key={`line-${index}`} className="h-0.5 flex-1" />,
            ])}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-16" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-16" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-1">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-14" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
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
  const statusOptions = getOrderStatusOptions(order, categories)
  const releaseOption = statusOptions.find((option) => option.value === "released")
  const refundOption = statusOptions.find((option) => option.value === "refunded")
  const isReleaseLocked = isReleaseLockedForRole(order.status, role)
  const canCancel = !isTerminalStatus(order.status) && !isReleaseLocked
  const canRefund = Boolean(refundOption && !refundOption.disabled)
  const canRelease = Boolean(releaseOption && !releaseOption.disabled)
  const canEditOrder = !isReleaseLocked
  const displayStatus = optimisticStatus ?? order.status

  function handleCopySummary() {
    if (items.length === 0 || !order) return

    console.log(
      "Order item notes:",
      items.map((item) => ({ name: item.productName, notes: item.notes }))
    )

    const infoLines = buildCopyableOrderText(
      items.map((item) => ({
        name: item.productName,
        lines: buildLineItemInfoLines({
          options: item.selectedOptions.map((option) => ({ name: option.optionName, value: option.value })),
          pricing: item.pricing,
          stickerQuotation: item.stickerQuotation,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        }),
      }))
    )

    copyToClipboard(
      formatOrderSummaryText({
        infoLines,
        subtotal: order.subtotal,
        additionalFees: order.additionalFees,
        layoutFee: order.layoutFee,
        shippingFee: order.shippingAddress?.fee ?? 0,
        discount: order.discount,
        total: order.total,
        notes: order.notes,
      })
    )
  }

  function handleCopyShippingAddress() {
    if (!order?.shippingAddress) return
    const { name, phone, address } = order.shippingAddress
    copyToClipboard(`${name}\n${phone}\n${address}`)
  }

  function handleOpenSpx() {
    window.open(SPX_ADMIN_CREATE_ORDER_URL, "_blank", "noopener,noreferrer")
  }

  async function handleStatusChange(value: string | null) {
    if (!order || !value || value === order.status) return
    if (value === "cancelled") return setCancelling(true)
    if (value === "refunded") return setRefunding(true)
    if (value === "returned") return setReturning(true)
    setOptimisticStatus(value as OrderStatus)
    await updateStatus(order, value as OrderStatus)
    setOptimisticStatus(null)
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

  async function handleConfirmReturn(target: Order) {
    setIsReturning(true)
    try {
      await setOrderStatus(target.id, "returned")
      toast.success("Order returned.")
      setReturning(false)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to return order.")
    } finally {
      setIsReturning(false)
    }
  }

  async function handleConfirmPayment(target: Order, payment: Payment) {
    setIsPaying(true)
    try {
      await updateOrder(target.id, { payment })
      toast.success("Payment updated.")
      setPayingTargetStatus(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update payment.")
    } finally {
      setIsPaying(false)
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

      <ReturnOrderDialog
        order={returning ? order : null}
        isPending={isReturning}
        onOpenChange={(open) => !open && setReturning(false)}
        onConfirm={handleConfirmReturn}
      />

      <RecordPaymentDialog
        order={payingTargetStatus ? order : null}
        targetStatus={payingTargetStatus}
        isPending={isPaying}
        onOpenChange={(open) => !open && setPayingTargetStatus(null)}
        onConfirm={handleConfirmPayment}
      />

      <Card>
        <CardContent>
          <OrderStatusStepper order={order} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Product</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {items.map((orderItem, index) => (
                  <OrderItemSummary
                    key={orderItem.id}
                    item={orderItem}
                    index={index}
                    showIndex={items.length > 1}
                    defaultOpen={items.length === 1}
                  />
                ))}
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
            <CardContent className="grid grid-cols-[max-content_1fr] items-baseline gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="justify-self-end">{formatCurrency(order.subtotal)}</span>

              <span className="text-muted-foreground">Additional Fees</span>
              <span className="justify-self-end">
                {formatCurrency(order.additionalFees)}
                {order.notes.trim() && ` (${order.notes.trim()})`}
              </span>

              {order.layoutFee >= 1 && (
                <>
                  <span className="text-muted-foreground">Layout Fee</span>
                  <span className="justify-self-end">{formatCurrency(order.layoutFee)}</span>
                </>
              )}

              {!!order.shippingAddress?.fee && (
                <>
                  <span className="text-muted-foreground">Shipping Fee</span>
                  <span className="justify-self-end">{formatCurrency(order.shippingAddress.fee)}</span>
                </>
              )}

              <span className="text-muted-foreground">Discount</span>
              <span className="justify-self-end">{formatCurrency(order.discount)}</span>

              <Separator className="col-span-2" />

              <span className="font-medium">Total</span>
              <span className="justify-self-end font-medium">{formatCurrency(order.total)}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-[max-content_1fr] items-baseline gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground">Channel</span>
              <span className="justify-self-end">{order.channel}</span>

              <span className="text-muted-foreground">Status</span>
              <span className="justify-self-end">
                {canManage && !isReleaseLocked ? (
                  <PaymentStatusMenu
                    order={order}
                    onRequestPayment={(_order, targetStatus) => setPayingTargetStatus(targetStatus)}
                    size="lg"
                  />
                ) : (
                  <PaymentStatusBadge status={order.payment.status} />
                )}
              </span>

              {order.payment.status !== "unpaid" && order.payment.status !== "refunded" && (
                <>
                  <span className="text-muted-foreground">Method</span>
                  <span className="justify-self-end">{order.payment.method}</span>

                  <span className="text-muted-foreground">Down Payment</span>
                  <span className="justify-self-end">{formatCurrency(order.payment.downPayment)}</span>

                  <span className="text-muted-foreground">Balance</span>
                  <span className="justify-self-end">{formatCurrency(order.payment.balance)}</span>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:col-span-1 lg:self-start">
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

          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
                <CardAction className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy shipping address"
                    onClick={handleCopyShippingAddress}
                  >
                    <CopyIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open SPX order form"
                    onClick={handleOpenSpx}
                  >
                    <ExternalLinkIcon />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-baseline gap-1.5 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{order.shippingAddress.name}</span>
                </div>
                <div className="flex items-baseline gap-1.5 text-sm">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{order.shippingAddress.phone}</span>
                </div>
                <div className="flex items-baseline gap-1.5 text-sm">
                  <span className="shrink-0 text-muted-foreground">Address:</span>
                  <span>{order.shippingAddress.address}</span>
                </div>
                {order.shippingAddress.fee > 0 && (
                  <div className="flex items-baseline gap-1.5 text-sm">
                    <span className="text-muted-foreground">Shipping Fee:</span>
                    <span>{formatCurrency(order.shippingAddress.fee)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {isReleaseLocked ? (
                  <OrderStatusBadge status={order.status} />
                ) : (
                  <OrderStatusMenu
                    order={order}
                    onCancel={() => setCancelling(true)}
                    onRefund={() => setRefunding(true)}
                    onReturn={() => setReturning(true)}
                    onOptimisticChange={setOptimisticStatus}
                    size="lg"
                  />
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
      </div>
    </div>
  )
}
