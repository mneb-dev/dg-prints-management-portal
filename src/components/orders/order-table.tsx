import {
  MoreHorizontalIcon,
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
import { type MouseEvent, type ReactNode } from "react"
import { Link } from "react-router-dom"

import { DataCardItem, DataCardList, DataCardListSkeleton } from "@/components/data-card-list"
import { Badge } from "@/components/ui/badge"
import { TABLE_HEAD_CLASS, TABLE_HEADER_CLASS, TABLE_SURFACE_CLASS } from "@/components/table-surface"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { TickingText } from "@/components/ticking-text"
import {
  describeOrderItemFull,
  describeOrderItemParts,
  notedItems,
} from "@/lib/order-item-description"
import { canEditOrderMetadata, getAmountDue, isReleaseLockedForRole } from "@/lib/orders"
import type { Order } from "@/lib/orders"
import type { Role } from "@/lib/users"
import { cn, formatCurrency, formatDate, formatDateTime, formatTimeAgo } from "@/lib/utils"

import { OrderStatusBadge } from "./order-status-badge"
import { OrderStatusMenu } from "./order-status-menu"
import { PaymentStatusBadge } from "./payment-status-badge"
import { PaymentStatusMenu } from "./payment-status-menu"

const STICKY_CELL_CLASS = "sticky left-0 z-10 bg-card"

/** Cells holding their own controls (menus, tooltips, buttons) stop the click here so it doesn't
 * also trigger the row's "open order". React events bubble through portals, so this covers menu
 * items and dialogs rendered from inside these cells too. */
function stopRowClick(event: MouseEvent) {
  event.stopPropagation()
}

function TableColumns() {
  return (
    <TableHeader className={TABLE_HEADER_CLASS}>
      <TableRow className="hover:bg-transparent">
        <TableHead className={cn(TABLE_HEAD_CLASS, STICKY_CELL_CLASS, "bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))]")}>Order</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Customer</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Product</TableHead>
        <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Total</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Payment</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Updated</TableHead>
        <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

export function OrderTable({
  footer,
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
  /** Rendered inside the table surface, below the rows (the pager). Hidden in loading/empty/error states. */
  footer?: ReactNode
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
  const actionHandlers = { onEdit, onDelete, onArrange, onRequestOR }

  if (isLoading) {
    return (
      <div className={TABLE_SURFACE_CLASS}>
        <DataCardListSkeleton />
        <Table className="max-md:hidden">
          <TableColumns />
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className={cn("px-4", STICKY_CELL_CLASS)}>
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
      <Empty className={TABLE_SURFACE_CLASS}>
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
        <Empty className={TABLE_SURFACE_CLASS}>
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
      <Empty className={TABLE_SURFACE_CLASS}>
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
      <div className={cn(TABLE_SURFACE_CLASS, isFetching && "opacity-60 transition-opacity duration-150")}>
        <div className="hidden md:block">
          <Table>
            <TableColumns />
            <TableBody>
              {orders.map((order) => {
                const isReleaseLocked = isReleaseLockedForRole(order.status, role)
                const due = getAmountDue(order)

                return (
                  <TableRow
                    key={order.id}
                    onClick={() => {
                      // Selecting text in a row (e.g. copying an order number) shouldn't navigate.
                      if (window.getSelection()?.toString()) return
                      onView(order)
                    }}
                    className="group/row cursor-pointer transition-colors duration-150 hover:bg-accent/40"
                  >
                    <TableCell
                      className={cn(
                        "px-4",
                        STICKY_CELL_CLASS,
                        "transition-colors duration-150 group-hover/row:bg-[color-mix(in_oklab,var(--color-accent)_40%,var(--color-card))]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {/* Real link: keyboard/Tab access and ctrl/middle-click to a new tab. */}
                        <Link
                          to={`/orders/${order.id}`}
                          onClick={stopRowClick}
                          className="rounded-sm font-medium tabular-nums outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {order.orderNumber}
                        </Link>
                        {order.orRequest ? <OrChip orRequest={order.orRequest} /> : null}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div>{order.customerName}</div>
                      <div className="text-xs text-muted-foreground">{order.channel}</div>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground" onClick={stopRowClick}>
                      <div className="text-foreground">{order.items[0]?.productName ?? "—"}</div>
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
                    <TableCell className="px-4 text-right">
                      <div className="font-medium tabular-nums">{formatCurrency(order.total)}</div>
                      {due > 0 ? (
                        <div className="mt-0.5 text-xs text-status-warning tabular-nums">{formatCurrency(due)} due</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-4" onClick={stopRowClick}>
                      <PaymentControl order={order} editable={canManage && !isReleaseLocked} onRequestPayment={onRequestPayment} />
                    </TableCell>
                    <TableCell className="px-4" onClick={stopRowClick}>
                      <StatusControl
                        order={order}
                        editable={canManage && !isReleaseLocked}
                        role={role}
                        onCancel={onCancel}
                        onRefund={onRefund}
                        onReturn={onReturn}
                      />
                    </TableCell>
                    <TableCell
                      className="px-4 whitespace-nowrap text-muted-foreground"
                      title={order.statusUpdatedAt ? formatDateTime(order.statusUpdatedAt) : undefined}
                    >
                      <TickingText intervalMs={30_000} format={() => formatTimeAgo(order.statusUpdatedAt)} />
                    </TableCell>
                    <TableCell className="px-4 text-right" onClick={stopRowClick}>
                      <RowActions order={order} role={role} canManage={canManage} {...actionHandlers} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <DataCardList>
          {orders.map((order) => {
            const isReleaseLocked = isReleaseLockedForRole(order.status, role)
            const due = getAmountDue(order)
            const withNotes = notedItems(order.items)
            const firstNotes = withNotes[0] ? describeOrderItemFull(withNotes[0]) : null

            return (
              <DataCardItem key={order.id} onOpen={() => onView(order)} aria-label={`Order ${order.orderNumber}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/orders/${order.id}`}
                        onClick={stopRowClick}
                        className="rounded-sm font-medium tabular-nums outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {order.orderNumber}
                      </Link>
                      {order.orRequest ? <OrChip orRequest={order.orRequest} expanded /> : null}
                    </div>
                    <div className="mt-0.5 truncate">
                      {order.customerName}
                      {order.channel ? <span className="text-muted-foreground"> · {order.channel}</span> : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-medium tabular-nums">{formatCurrency(order.total)}</div>
                    {due > 0 ? (
                      <div className="mt-0.5 text-xs text-status-warning tabular-nums">{formatCurrency(due)} due</div>
                    ) : null}
                  </div>
                </div>

                <div className="text-muted-foreground">
                  <span className="text-foreground">{order.items[0]?.productName ?? "—"}</span>
                  {order.items.length > 1 ? ` +${order.items.length - 1} more` : null}
                  {/* The table shows notes in a hover tooltip; touch has no hover, so show them inline. */}
                  {firstNotes?.notes ? (
                    <p className="mt-0.5 line-clamp-2 text-xs">
                      {firstNotes.notes}
                      {firstNotes.size && ` (${firstNotes.size})`}
                      {withNotes.length > 1 && ` · ${withNotes.length - 1} more with notes`}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5" onClick={stopRowClick}>
                    <PaymentControl
                      order={order}
                      editable={canManage && !isReleaseLocked}
                      onRequestPayment={onRequestPayment}
                    />
                    <StatusControl
                      order={order}
                      editable={canManage && !isReleaseLocked}
                      role={role}
                      onCancel={onCancel}
                      onRefund={onRefund}
                      onReturn={onReturn}
                    />
                  </div>
                  <div className="shrink-0" onClick={stopRowClick}>
                    <RowActions order={order} role={role} canManage={canManage} {...actionHandlers} />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created {formatDate(order.createdAt)} · Updated{" "}
                  <TickingText intervalMs={30_000} format={() => formatTimeAgo(order.statusUpdatedAt)} />
                </div>
              </DataCardItem>
            )
          })}
        </DataCardList>
        {footer}
      </div>
      {isFetching && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border">
          <Loader2Icon className="size-3.5 animate-spin" />
          Updating…
        </div>
      )}
    </div>
  )
}

function PaymentControl({
  order,
  editable,
  onRequestPayment,
}: {
  order: Order
  editable?: boolean
  onRequestPayment: (order: Order, targetStatus: "paid" | "partially_paid") => void
}) {
  return editable ? (
    <PaymentStatusMenu order={order} onRequestPayment={onRequestPayment} />
  ) : (
    <PaymentStatusBadge status={order.payment.status} />
  )
}

function StatusControl({
  order,
  editable,
  role,
  onCancel,
  onRefund,
  onReturn,
}: {
  order: Order
  editable?: boolean
  role?: Role | null
  onCancel: (order: Order) => void
  onRefund: (order: Order) => void
  onReturn: (order: Order) => void
}) {
  return editable ? (
    <OrderStatusMenu
      order={order}
      onCancel={onCancel}
      onRefund={onRefund}
      onReturn={onReturn}
      role={role}
      showCuringDuration={false}
    />
  ) : (
    <OrderStatusBadge status={order.status} />
  )
}

/** Edit button + "more" menu — the same in a table row and a phone card. */
function RowActions({
  order,
  role,
  canManage,
  onEdit,
  onDelete,
  onArrange,
  onRequestOR,
}: {
  order: Order
  role?: Role | null
  canManage?: boolean
  onEdit: (order: Order) => void
  onDelete: (order: Order) => void
  onArrange: (order: Order) => void
  onRequestOR: (order: Order) => void
}) {
  const isAdminTier = canEditOrderMetadata(role)
  const isReleaseLocked = isReleaseLockedForRole(order.status, role)
  const arrangeBlocker = !order.shippingAddress
    ? "Needs a shipping address"
    : order.payment.status !== "paid"
      ? "Needs payment marked Paid"
      : null
  const hasMenuActions = canManage || isAdminTier

  return (
    <div className="flex justify-end gap-1">
      {canManage && (
        <RowActionButton
          label={`Edit ${order.orderNumber}`}
          tooltip={isReleaseLocked ? "Released orders are locked for your role." : "Edit order"}
          icon={<PencilIcon />}
          disabled={isReleaseLocked}
          onClick={() => onEdit(order)}
        />
      )}
      {hasMenuActions && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`More actions for ${order.orderNumber}`}
                className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {isAdminTier && (
              <DropdownMenuItem disabled={arrangeBlocker !== null} onClick={() => onArrange(order)}>
                <PackageCheckIcon />
                <span className="flex flex-col gap-0.5">
                  <span className="leading-none">Arrange shipment</span>
                  {arrangeBlocker ? (
                    <span className="text-xs leading-none text-muted-foreground">{arrangeBlocker}</span>
                  ) : null}
                </span>
              </DropdownMenuItem>
            )}
            {canManage && (
              <>
                <DropdownMenuItem onClick={() => onRequestOR(order)}>
                  <ReceiptTextIcon />
                  <span className="leading-none">{order.orRequest ? "Update OR request" : "Request OR"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={isReleaseLocked} onClick={() => onDelete(order)}>
                  <Trash2Icon />
                  <span className="flex flex-col gap-0.5">
                    <span className="leading-none">Delete order</span>
                    {isReleaseLocked ? (
                      <span className="text-xs leading-none text-muted-foreground">
                        Locked for your role once released
                      </span>
                    ) : null}
                  </span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

/** OR request state at a glance: green dot once an invoice number is recorded, amber while it's
 * still missing — neutral chrome + dot, per the design system's status-chip rule. `expanded`
 * spells the state out in the chip, for touch screens where the tooltip can't be hovered. */
function OrChip({ orRequest, expanded }: { orRequest: NonNullable<Order["orRequest"]>; expanded?: boolean }) {
  const isIssued = Boolean(orRequest.invoiceNumber)
  if (expanded) {
    return (
      <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-xs">
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", isIssued ? "bg-status-success" : "bg-status-warning")}
        />
        {isIssued ? `OR #${orRequest.invoiceNumber}` : "OR requested"}
      </Badge>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<span onClick={stopRowClick} />} className="inline-flex cursor-default">
        <Badge variant="secondary" className="h-4.5 gap-1 px-1.5 text-[0.65rem]">
          <span
            aria-hidden
            className={cn(
              "size-1.5 shrink-0 translate-y-px rounded-full",
              isIssued ? "bg-status-success" : "bg-status-warning"
            )}
          />
          <span className="leading-none">OR</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {isIssued ? `OR issued · #${orRequest.invoiceNumber}` : "OR requested — missing invoice number"}
      </TooltipContent>
    </Tooltip>
  )
}

function RowActionButton({
  label,
  tooltip,
  icon,
  onClick,
  disabled,
}: {
  label: string
  tooltip: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={disabled ? 0 : -1} className="inline-flex" />}>
        <Button variant="ghost" size="icon-sm" disabled={disabled} onClick={onClick}>
          {icon}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
