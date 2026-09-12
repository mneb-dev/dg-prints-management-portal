import {
  CheckIcon,
  CircleAlertIcon,
  EyeIcon,
  Loader2Icon,
  PackageCheckIcon,
  PackageSearchIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  describeOrderItemFull,
  describeOrderItemParts,
  notedItems,
} from "@/lib/order-item-description"
import { canEditOrderMetadata, isReleaseLockedForRole } from "@/lib/orders"
import type { Order } from "@/lib/orders"
import type { Role } from "@/lib/users"
import { cn, formatCurrency, formatDate, formatTimeAgo } from "@/lib/utils"

import { OrderStatusBadge } from "./order-status-badge"
import { OrderStatusMenu } from "./order-status-menu"
import { PaymentStatusBadge } from "./payment-status-badge"
import { PaymentStatusMenu } from "./payment-status-menu"

export function OrderTable({
  orders,
  isLoading,
  isFetching,
  isError,
  error,
  hasActiveFilters,
  searchTerm,
  canManage,
  role,
  onClearFilters,
  onCreate,
  onView,
  onEdit,
  onCancel,
  onRefund,
  onReturn,
  onDelete,
  onRequestPayment,
  onArrange,
  onRequestOR,
}: {
  orders: Order[]
  isLoading?: boolean
  isFetching?: boolean
  isError?: boolean
  error?: string | null
  hasActiveFilters?: boolean
  searchTerm?: string
  canManage?: boolean
  role?: Role | null
  onClearFilters?: () => void
  onCreate?: () => void
  onView: (order: Order) => void
  onEdit: (order: Order) => void
  onCancel: (order: Order) => void
  onRefund: (order: Order) => void
  onReturn: (order: Order) => void
  onDelete: (order: Order) => void
  onRequestPayment: (order: Order, targetStatus: "paid" | "partially_paid") => void
  onArrange: (order: Order) => void
  onRequestOR: (order: Order) => void
}) {
  const isAdminTier = canEditOrderMetadata(role)

  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background px-4">Order</TableHead>
              <TableHead className="px-4">Customer</TableHead>
              <TableHead className="px-4">Product</TableHead>
              <TableHead className="px-4 text-right">Total</TableHead>
              <TableHead className="px-4">Payment</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Last Status Update</TableHead>
              <TableHead className="px-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="sticky left-0 bg-background px-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-1.5 h-3 w-16" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1.5 h-3 w-14" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="px-4 text-right">
                  <Skeleton className="ml-auto h-4 w-16" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="px-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Skeleton className="size-7 rounded-md" />
                    <Skeleton className="size-7 rounded-md" />
                    <Skeleton className="size-7 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
          <EmptyTitle>Couldn't load orders</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (orders.length === 0) {
    if (hasActiveFilters) {
      return (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageSearchIcon />
            </EmptyMedia>
            <EmptyTitle>No orders match your {searchTerm ? "search" : "filters"}</EmptyTitle>
            <EmptyDescription>
              {searchTerm
                ? `No results for "${searchTerm}". Try a different search or clear your filters.`
                : "Try adjusting or clearing your filters."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <XIcon data-icon="inline-start" />
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )
    }
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearchIcon />
          </EmptyMedia>
          <EmptyTitle>No orders yet</EmptyTitle>
          <EmptyDescription>Get started by creating your first order.</EmptyDescription>
        </EmptyHeader>
        {canManage && (
          <EmptyContent>
            <Button size="sm" onClick={onCreate}>
              <PlusIcon data-icon="inline-start" />
              New Order
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div className="relative" aria-busy={isFetching}>
      <div className={cn("rounded-lg border", isFetching && "opacity-60 transition-opacity duration-150")}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background px-4">Order</TableHead>
            <TableHead className="px-4">Customer</TableHead>
            <TableHead className="px-4">Product</TableHead>
            <TableHead className="px-4 text-right">Total</TableHead>
            <TableHead className="px-4">Payment</TableHead>
            <TableHead className="px-4">Status</TableHead>
            <TableHead className="px-4">Last Status Update</TableHead>
            <TableHead className="px-4 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const isReleaseLocked = isReleaseLockedForRole(order.status, role)

            return (
              <TableRow key={order.id}>
                <TableCell className="sticky left-0 bg-background px-4 font-medium">
                  {order.orderNumber}
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                    Created {formatDate(order.createdAt)}
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <div>{order.customerName}</div>
                  <div className="text-xs font-normal text-muted-foreground">{order.channel}</div>
                </TableCell>
                <TableCell className="px-4 text-muted-foreground">
                  <div>{order.items[0]?.productName ?? "—"}</div>
                  {(() => {
                    const withNotes = notedItems(order.items)
                    const parts = withNotes[0] ? describeOrderItemParts(withNotes[0]) : null
                    if (!parts?.notes) {
                      return <span className="mt-0.5 block text-xs">—</span>
                    }
                    return (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              className="mt-0.5 inline-flex cursor-default items-center gap-1"
                            />
                          }
                        >
                          <span className="text-xs">
                            {parts.notes}
                            {parts.notesTruncated && "…"}
                            {parts.size && (
                              <span className="text-muted-foreground/70"> | {parts.size}</span>
                            )}
                            {withNotes.length > 1 && (
                              <span className="text-muted-foreground/70"> +{withNotes.length - 1}</span>
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm text-[11px]">
                          <div className="flex flex-col gap-0.5">
                            {withNotes.map((noted) => {
                              const full = describeOrderItemFull(noted)
                              return (
                                <div key={noted.id}>
                                  <span className="font-medium">{noted.productName}:</span>{" "}
                                  {full.notes}
                                  {full.size && ` (${full.size})`}
                                </div>
                              )
                            })}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })()}
                </TableCell>
                <TableCell className="px-4 text-right tabular-nums">
                  {formatCurrency(order.total)}
                </TableCell>
                <TableCell className="px-4">
                  {canManage && !isReleaseLocked ? (
                    <PaymentStatusMenu
                      order={order}
                      onRequestPayment={onRequestPayment}
                      triggerClassName="w-28"
                    />
                  ) : (
                    <PaymentStatusBadge status={order.payment.status} className="w-28" />
                  )}
                </TableCell>
                <TableCell className="px-4">
                  {canManage && !isReleaseLocked ? (
                    <OrderStatusMenu
                      order={order}
                      onCancel={onCancel}
                      onRefund={onRefund}
                      onReturn={onReturn}
                      role={role}
                      triggerClassName="w-36 truncate"
                    />
                  ) : (
                    <OrderStatusBadge
                      status={order.status}
                      statusUpdatedAt={order.statusUpdatedAt}
                      className="w-36 truncate"
                    />
                  )}
                </TableCell>
                <TableCell className="px-4 text-muted-foreground">
                  {formatTimeAgo(order.statusUpdatedAt)}
                </TableCell>
                <TableCell className="px-4 text-right">
                  <div className="flex justify-end gap-1">
                    <RowActionButton
                      label={`View ${order.orderNumber}`}
                      tooltip="View order"
                      icon={<EyeIcon />}
                      onClick={() => onView(order)}
                    />
                    {isAdminTier && (
                      <RowActionButton
                        label={`Arrange ${order.orderNumber}`}
                        tooltip={
                          !order.shippingAddress
                            ? "Requires a shipping address"
                            : order.payment.status !== "paid"
                              ? "Requires payment marked Paid"
                              : "Arrange shipment"
                        }
                        icon={<PackageCheckIcon />}
                        disabled={!order.shippingAddress || order.payment.status !== "paid"}
                        onClick={() => onArrange(order)}
                      />
                    )}
                    {canManage && (
                      <>
                        <RowActionButton
                          label={`Edit ${order.orderNumber}`}
                          tooltip={
                            isReleaseLocked ? "Released orders are locked for your role." : "Edit order"
                          }
                          icon={<PencilIcon />}
                          disabled={isReleaseLocked}
                          onClick={() => onEdit(order)}
                        />
                        <RowActionButton
                          label={`Request OR for ${order.orderNumber}`}
                          tooltip={
                            !order.orRequest
                              ? "Request OR"
                              : order.orRequest.invoiceNumber
                                ? "Update OR request"
                                : "Update OR request (missing invoice number)"
                          }
                          icon={<OrRequestIcon orRequest={order.orRequest} />}
                          onClick={() => onRequestOR(order)}
                        />
                        <RowActionButton
                          label={`Delete ${order.orderNumber}`}
                          tooltip={
                            isReleaseLocked ? "Released orders are locked for your role." : "Delete order"
                          }
                          icon={<Trash2Icon />}
                          disabled={isReleaseLocked}
                          destructive
                          onClick={() => onDelete(order)}
                        />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
      {isFetching && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border">
          <Loader2Icon className="size-3.5 animate-spin" />
          Updating…
        </div>
      )}
    </div>
  )
}

function OrRequestIcon({ orRequest }: { orRequest: Order["orRequest"] }) {
  if (!orRequest) return <ReceiptTextIcon />

  return (
    <span className="relative inline-flex">
      <ReceiptTextIcon />
      {orRequest.invoiceNumber ? (
        <CheckIcon className="absolute -right-1 -bottom-1 size-2.5 rounded-full bg-background stroke-3 text-primary ring-1 ring-background" />
      ) : (
        <CircleAlertIcon className="absolute -right-1 -bottom-1 size-2.5 rounded-full bg-background text-destructive ring-1 ring-background" />
      )}
    </span>
  )
}

function RowActionButton({
  label,
  tooltip,
  icon,
  onClick,
  disabled,
  destructive,
}: {
  label: string
  tooltip: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={disabled ? 0 : -1} className="inline-flex" />}>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={onClick}
          className={cn(destructive && "hover:bg-destructive/10 hover:text-destructive")}
        >
          {icon}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
