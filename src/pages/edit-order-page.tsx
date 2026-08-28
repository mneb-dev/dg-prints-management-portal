import { FileWarningIcon } from "lucide-react"
import { useParams } from "react-router-dom"

import { OrderForm } from "@/components/orders/order-form"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useOrders } from "@/lib/orders"

export function EditOrderPage() {
  const { id } = useParams<{ id: string }>()
  const { getOrder } = useOrders()
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit Order {order.orderNumber}</h1>
      <OrderForm order={order} />
    </div>
  )
}
