import { useState, type ReactNode } from "react"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  FileWarningIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  TruckIcon,
  Undo2Icon,
  UserIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog"
import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { OrderItemSummary } from "@/components/orders/order-item-summary"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { OrderStatusMenu } from "@/components/orders/order-status-menu"
import { OrderStatusStepper } from "@/components/orders/order-status-stepper"
import { OrderTotals } from "@/components/orders/order-summary-panel"
import { PaymentRecap } from "@/components/orders/payment-recap"
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import { PaymentStatusMenu } from "@/components/orders/payment-status-menu"
import { RecordPaymentDialog } from "@/components/orders/record-payment-dialog"
import { RefundOrderDialog } from "@/components/orders/refund-order-dialog"
import { ReturnOrderDialog } from "@/components/orders/return-order-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import { useCategories } from "@/lib/categories"
import { copyToClipboard, SPX_ADMIN_CREATE_ORDER_URL } from "@/lib/clipboard"
import { useActiveOrderStatuses } from "@/lib/order-statuses"
import {
  buildCopyableOrderText,
  buildLineItemInfoLines,
  buildStickerCopyLines,
  formatOrderSummaryText,
  usesCompactStickerCopyFormat,
  type CopyableLineItem,
} from "@/lib/quote-text"
import {
  getAmountDue,
  getOrderStatusOptions,
  isReleaseLockedForRole,
  isTerminalStatus,
  useCustomerRankings,
  useOrder,
  useOrderActions,
  useOrderStatusUpdate,
} from "@/lib/orders"
import type { Order, OrderStatus, Payment } from "@/lib/orders"
import { cn, formatCurrency, formatDateTime, formatRelativeDate } from "@/lib/utils"

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { order, isLoading, isError, error } = useOrder(id)
  const { setOrderStatus, updateOrder } = useOrderActions()
  const { updateStatus, isUpdating: isUpdatingStatus } = useOrderStatusUpdate()
  const { role, hasPermission } = useAuth()
  const canManage = hasPermission("manage_orders")
  const { categories } = useCategories()
  const { statuses } = useActiveOrderStatuses()
  const { customerDetailsByName, windowDays: customerWindowDays } = useCustomerRankings()
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4 xl:col-span-2">
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

          <div className="flex flex-col gap-4 xl:col-span-1">
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
  const statusOptions = getOrderStatusOptions(
    order,
    categories,
    role,
    statuses.map((s) => s.name)
  )
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

    const infoLines = buildCopyableOrderText(
      items.map((item) => {
        const copyable: CopyableLineItem = {
          options: item.selectedOptions.map((option) => ({ name: option.optionName, value: option.value })),
          pricing: item.pricing,
          stickerQuotation: item.stickerQuotation,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          notes: item.notes,
        }

        return {
          name: item.productName,
          lines: usesCompactStickerCopyFormat(item.productCategory)
            ? buildStickerCopyLines(copyable)
            : buildLineItemInfoLines(copyable),
        }
      })
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

  const returnOption = statusOptions.find((option) => option.value === "returned")
  const canReturn = Boolean(returnOption && !returnOption.disabled)
  // Same stored-value maths as the Orders table's "₱X due" (getAmountDue), so both always agree.
  const amountDue = getAmountDue(order)
  const amountPaid =
    order.payment.status === "unpaid" || order.payment.status === "refunded"
      ? 0
      : Math.max(order.total - amountDue, 0)
  const returningCustomer = customerDetailsByName.get(order.customerName.trim()) ?? null
  const unavailableReason = isReleaseLocked ? "Locked once released" : "Not available at this stage"

  return (
    <div className="flex flex-col gap-4">
      {/* Header: identity + primary actions; anything destructive or rarely used lives in ⋯. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" size="icon-sm" className="mt-0.5" render={<Link to="/orders" />} nativeButton={false}>
            <ArrowLeftIcon />
            <span className="sr-only">Back to Orders</span>
          </Button>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tabular-nums">Order {order.orderNumber}</h1>
              <OrderStatusBadge
                key={displayStatus}
                status={displayStatus}
                statusUpdatedAt={order.statusUpdatedAt}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Created{" "}
              <Tooltip>
                <TooltipTrigger className="cursor-default font-medium text-foreground">
                  {formatRelativeDate(order.createdAt)}
                </TooltipTrigger>
                <TooltipContent>{formatDateTime(order.createdAt)}</TooltipContent>
              </Tooltip>{" "}
              by {order.createdByName || "Unknown user"}
              {order.channel ? ` · ${order.channel}` : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* After creating an order the user lands here — keep the next one a click away. */}
          {canManage && (
            <Button variant="outline" render={<Link to="/orders/new" />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              New order
            </Button>
          )}
          {canRelease && (
            <Button variant="outline" disabled={isUpdatingStatus} onClick={() => handleStatusChange("released")}>
              <CheckCircle2Icon data-icon="inline-start" />
              Release
            </Button>
          )}
          {canEditOrder ? (
            <Button render={<Link to={`/orders/${order.id}/edit`} />} nativeButton={false}>
              <PencilIcon data-icon="inline-start" />
              Edit order
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger render={<span tabIndex={0} className="inline-flex" />}>
                <Button disabled>
                  <PencilIcon data-icon="inline-start" />
                  Edit order
                </Button>
              </TooltipTrigger>
              <TooltipContent>Released orders are locked for your role.</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More order actions"
                  className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <ActionMenuItem
                icon={<RotateCcwIcon />}
                label="Refund order"
                disabledReason={canRefund ? null : unavailableReason}
                onClick={() => setRefunding(true)}
              />
              <ActionMenuItem
                icon={<Undo2Icon />}
                label="Return order"
                disabledReason={canReturn ? null : unavailableReason}
                onClick={() => setReturning(true)}
              />
              <DropdownMenuSeparator />
              <ActionMenuItem
                icon={<XCircleIcon />}
                label="Cancel order"
                variant="destructive"
                disabledReason={canCancel ? null : isReleaseLocked ? "Locked once released" : "Order is already closed"}
                onClick={() => setCancelling(true)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
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
          {/* Fed the optimistic status so the progress track animates the moment a new status is
              picked, not after the save round-trip. */}
          <OrderStatusStepper
            order={displayStatus !== order.status ? { ...order, status: displayStatus } : order}
          />
        </CardContent>
      </Card>

      {/* Same shape as the order form: content on the left, a sticky summary column on the right. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <OrderFormSectionHeader
                  icon={PackageIcon}
                  title="Items"
                  description={items.length === 1 ? "1 item" : `${items.length} items`}
                />
              </CardHeader>
              <CardContent className="flex flex-col divide-y">
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
              <OrderFormSectionHeader icon={WalletIcon} title="Payment" description="Channel and how much is paid" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <dt className="text-xs text-muted-foreground">Channel</dt>
                  <dd className="font-medium">{order.channel || "—"}</dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd>
                    {canManage && !isReleaseLocked ? (
                      <PaymentStatusMenu
                        order={order}
                        onRequestPayment={(_order, targetStatus) => setPayingTargetStatus(targetStatus)}
                      />
                    ) : (
                      <PaymentStatusBadge status={order.payment.status} />
                    )}
                  </dd>
                </div>
                {order.payment.status !== "unpaid" && order.payment.status !== "refunded" && (
                  <div className="flex flex-col gap-1.5">
                    <dt className="text-xs text-muted-foreground">Method</dt>
                    <dd className="font-medium">{order.payment.method || "—"}</dd>
                  </div>
                )}
              </dl>
              <PaymentRecap
                total={order.total}
                paid={amountPaid}
                balance={amountDue}
                isRefunded={order.payment.status === "refunded"}
              />
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <OrderFormSectionHeader icon={TruckIcon} title="Shipping" description="Delivery details" />
                <CardAction className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Copy shipping address"
                          onClick={handleCopyShippingAddress}
                        />
                      }
                    >
                      <CopyIcon />
                    </TooltipTrigger>
                    <TooltipContent>Copy address</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Open SPX order form"
                          onClick={handleOpenSpx}
                        />
                      }
                    >
                      <ExternalLinkIcon />
                    </TooltipTrigger>
                    <TooltipContent>Open SPX order form</TooltipContent>
                  </Tooltip>
                </CardAction>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs text-muted-foreground">Recipient</dt>
                    <dd className="font-medium">{order.shippingAddress.name}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd>
                      <a href={`tel:${order.shippingAddress.phone}`} className="tabular-nums hover:underline">
                        {order.shippingAddress.phone}
                      </a>
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Address</dt>
                    <dd className="whitespace-pre-line">{order.shippingAddress.address}</dd>
                  </div>
                  {order.shippingAddress.fee > 0 && (
                    <div className="flex flex-col gap-1">
                      <dt className="text-xs text-muted-foreground">Shipping fee</dt>
                      <dd className="tabular-nums">{formatCurrency(order.shippingAddress.fee)}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <OrderFormSectionHeader icon={ReceiptTextIcon} title="Order summary" />
              {items.length > 0 && (
                <CardAction>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={handleCopySummary}
                          aria-label="Copy order summary"
                        />
                      }
                    >
                      <CopyIcon />
                    </TooltipTrigger>
                    <TooltipContent>Copy summary</TooltipContent>
                  </Tooltip>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <OrderTotals
                subtotal={order.subtotal}
                additionalFees={order.additionalFees}
                feeNote={order.notes}
                layoutFee={order.layoutFee}
                layoutByName={order.layoutByName || undefined}
                shippingFee={order.shippingAddress?.fee ?? 0}
                discount={order.discount}
                total={order.total}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <OrderFormSectionHeader icon={UserIcon} title="Customer" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm">
              <p className="font-medium">{order.customerName}</p>
              {order.customerPhone && (
                <a href={`tel:${order.customerPhone}`} className="w-fit text-muted-foreground tabular-nums hover:underline">
                  {order.customerPhone}
                </a>
              )}
              {returningCustomer && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-order-status-teal" />
                  Returning customer · {returningCustomer.orderCount}{" "}
                  {returningCustomer.orderCount === 1 ? "order" : "orders"}
                  {customerWindowDays ? ` in the last ${customerWindowDays} days` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <OrderFormSectionHeader icon={HistoryIcon} title="Activity" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                {isReleaseLocked ? (
                  <OrderStatusBadge status={order.status} statusUpdatedAt={order.statusUpdatedAt} />
                ) : (
                  <OrderStatusMenu
                    order={order}
                    onCancel={() => setCancelling(true)}
                    onRefund={() => setRefunding(true)}
                    onReturn={() => setReturning(true)}
                    onOptimisticChange={setOptimisticStatus}
                    size="lg"
                    role={role}
                  />
                )}
              </div>
              {/* Mini timeline: newest first, dot + connector like the status stepper. */}
              <ol className="flex flex-col text-sm">
                {order.statusUpdatedAt && (
                  <ActivityEntry
                    label="Status updated"
                    by={order.statusUpdatedByName || "Unknown user"}
                    at={order.statusUpdatedAt}
                    isLatest
                  />
                )}
                <ActivityEntry
                  label="Created"
                  by={order.createdByName || "Unknown user"}
                  at={order.createdAt}
                  isLatest={!order.statusUpdatedAt}
                  isLast
                />
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/** ⋯ menu item that stays visible when unavailable, with the reason underneath — so users see
 * *why* they can't refund/cancel rather than the option silently missing. */
function ActionMenuItem({
  icon,
  label,
  disabledReason,
  onClick,
  variant = "default",
}: {
  icon: ReactNode
  label: string
  disabledReason: string | null
  onClick: () => void
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuItem variant={variant} disabled={disabledReason !== null} onClick={onClick}>
      {icon}
      <span className="flex flex-col gap-0.5">
        <span className="leading-none">{label}</span>
        {disabledReason ? (
          <span className="text-xs leading-none text-muted-foreground">{disabledReason}</span>
        ) : null}
      </span>
    </DropdownMenuItem>
  )
}

function ActivityEntry({
  label,
  by,
  at,
  isLatest = false,
  isLast = false,
}: {
  label: string
  by: string
  at: string
  isLatest?: boolean
  isLast?: boolean
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            isLatest ? "bg-primary ring-3 ring-primary/15" : "bg-muted-foreground/40"
          )}
        />
        {!isLast && <span aria-hidden className="w-px flex-1 bg-border" />}
      </div>
      <div className={cn("flex flex-col gap-0.5", !isLast && "pb-4")}>
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          by {by} ·{" "}
          <Tooltip>
            <TooltipTrigger className="cursor-default font-medium text-foreground">
              {formatRelativeDate(at)}
            </TooltipTrigger>
            <TooltipContent>{formatDateTime(at)}</TooltipContent>
          </Tooltip>
        </span>
      </div>
    </li>
  )
}
