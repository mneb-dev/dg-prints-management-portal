import {
  EllipsisVerticalIcon,
  Loader2Icon,
  PackageSearchIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { canRefundOrder, isTerminalStatus } from "@/lib/orders"
import type { Order } from "@/lib/orders"
import { formatCurrency, formatDate } from "@/lib/utils"

import { OrderStatusBadge } from "./order-status-badge"
import { PaymentStatusBadge } from "./payment-status-badge"

export function OrderTable({
  orders,
  isLoading,
  isError,
  error,
  onView,
  onEdit,
  onCancel,
  onRefund,
  onDelete,
}: {
  orders: Order[]
  isLoading?: boolean
  isError?: boolean
  error?: string | null
  onView: (order: Order) => void
  onEdit: (order: Order) => void
  onCancel: (order: Order) => void
  onRefund: (order: Order) => void
  onDelete: (order: Order) => void
}) {
  if (isLoading) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Loader2Icon className="animate-spin" />
          </EmptyMedia>
          <EmptyTitle>Loading orders…</EmptyTitle>
          <EmptyDescription>Fetching your orders.</EmptyDescription>
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
          <EmptyTitle>Couldn't load orders</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (orders.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearchIcon />
          </EmptyMedia>
          <EmptyTitle>No orders found</EmptyTitle>
          <EmptyDescription>
            Try adjusting your search or filters, or create a new order.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Description</TableHead>
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
            const canCancel = !isTerminalStatus(order.status)
            const canRefund = canRefundOrder(order.status, order.payment.status)
            return (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {order.items[0]?.productName ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.description || "—"}
                </TableCell>
                <TableCell>{formatCurrency(order.total)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={order.payment.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <EllipsisVerticalIcon />
                      <span className="sr-only">Actions for {order.orderNumber}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(order)}>View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(order)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem disabled={!canCancel} onClick={() => onCancel(order)}>
                        Cancel
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={!canRefund} onClick={() => onRefund(order)}>
                        Refund
                      </DropdownMenuItem>
                      {/* Delete is available to all authenticated staff for this MVP —
                          useAuth() has no roles yet, so a real admin-only gate isn't possible. */}
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(order)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
