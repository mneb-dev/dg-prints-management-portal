import {
  EllipsisVerticalIcon,
  Loader2Icon,
  PackageSearchIcon,
  PlusIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { cn, formatCurrency, formatDate } from "@/lib/utils"

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
  onDelete,
  onRequestPayment,
  onArrange,
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
  onDelete: (order: Order) => void
  onRequestPayment: (order: Order, targetStatus: "paid" | "partially_paid") => void
  onArrange: (order: Order) => void
}) {
  const isAdminTier = canEditOrderMetadata(role)

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="sticky left-0 bg-background">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto size-7 rounded-md" />
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
            <TableHead className="sticky left-0 bg-background">Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const isReleaseLocked = isReleaseLockedForRole(order.status, role)
            return (
              <TableRow key={order.id}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  {order.orderNumber}
                </TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {order.items[0]?.productName ?? "—"}
                  {order.items.length > 1 && (
                    <Badge variant="secondary" className="ml-1.5">
                      +{order.items.length - 1} more
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(() => {
                    const withNotes = notedItems(order.items)
                    const item = withNotes[0]
                    const parts = item ? describeOrderItemParts(item) : null
                    if (!item || !parts?.notes) return "—"
                    return (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              className="inline-flex cursor-default items-center gap-1.5"
                            />
                          }
                        >
                          <span
                            className={cn(
                              "text-foreground",
                              "underline decoration-muted-foreground/50 decoration-dotted underline-offset-2"
                            )}
                          >
                            {parts.notes}
                            {parts.notesTruncated ? "… " : " "}
                            {parts.size && parts.size}
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
                <TableCell>{formatCurrency(order.total)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell>
                  {canManage && !isReleaseLocked ? (
                    <OrderStatusMenu order={order} onCancel={onCancel} onRefund={onRefund} />
                  ) : (
                    <OrderStatusBadge status={order.status} />
                  )}
                </TableCell>
                <TableCell>
                  {canManage && !isReleaseLocked ? (
                    <PaymentStatusMenu order={order} onRequestPayment={onRequestPayment} />
                  ) : (
                    <PaymentStatusBadge status={order.payment.status} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <EllipsisVerticalIcon />
                      <span className="sr-only">Actions for {order.orderNumber}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(order)}>View</DropdownMenuItem>
                      {isAdminTier && (
                        <DropdownMenuItem
                          disabled={!order.shippingAddress}
                          onClick={() => onArrange(order)}
                        >
                          Arrange
                        </DropdownMenuItem>
                      )}
                      {canManage && (
                        <>
                          <DropdownMenuItem disabled={isReleaseLocked} onClick={() => onEdit(order)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isReleaseLocked}
                            onClick={() => onDelete(order)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
