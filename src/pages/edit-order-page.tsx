import { FileWarningIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react"
import { useParams } from "react-router-dom"

import { OrderForm } from "@/components/orders/order-form"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useOrder } from "@/lib/orders"

export function EditOrderPage() {
  const { id } = useParams<{ id: string }>()
  const { order, isLoading, isError, error } = useOrder(id)

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit Order {order.orderNumber}</h1>
      <OrderForm order={order} />
    </div>
  )
}
