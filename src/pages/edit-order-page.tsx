import { FileWarningIcon, LockIcon, TriangleAlertIcon } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { OrderForm } from "@/components/orders/order-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { canEditOrderMetadata, isReleaseLockedForRole, useOrder } from "@/lib/orders"

export function EditOrderPage() {
  const { id } = useParams<{ id: string }>()
  const { order, isLoading, isError, error } = useOrder(id)
  const { role } = useAuth()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <Card className="shadow-xs">
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>

            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index} className="shadow-xs">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}

            <Card className="shadow-xs">
              <CardHeader>
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader>
                <Skeleton className="h-5 w-16" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader>
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>

            {canEditOrderMetadata(role) && (
              <Card className="shadow-xs">
                <CardHeader>
                  <Skeleton className="h-5 w-20" />
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="shadow-xs">
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
                <Skeleton className="mt-2 h-6 w-full" />
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

  if (isReleaseLockedForRole(order.status, role)) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockIcon />
          </EmptyMedia>
          <EmptyTitle>This order can't be edited</EmptyTitle>
          <EmptyDescription>Released orders are locked for your role.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" render={<Link to={`/orders/${order.id}`} />}>
            Back to Order
          </Button>
        </EmptyContent>
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
