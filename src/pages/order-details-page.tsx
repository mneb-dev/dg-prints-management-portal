import { FileWarningIcon } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { ORDER_STATUS_LABELS, OrderStatusBadge } from "@/components/orders/order-status-badge"
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
import { ORDER_STATUSES, useOrders } from "@/lib/orders"
import type { OrderStatus } from "@/lib/orders"
import { formatCurrency } from "@/lib/utils"

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { getOrder, setOrderStatus } = useOrders()
  const order = id ? getOrder(id) : undefined

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

  function handleStatusChange(value: string | null) {
    if (!order || !value) return
    setOrderStatus(order.id, value as OrderStatus)
    toast.success("Status updated.")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Order {order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <Button render={<Link to={`/orders/${order.id}/edit`} />}>Edit Order</Button>
      </div>

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

            {item.notes && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Notes</span>
                <span>{item.notes}</span>
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
              {ORDER_STATUSES.map((status) => (
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
