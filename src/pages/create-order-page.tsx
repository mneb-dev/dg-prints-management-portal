import { OrderForm } from "@/components/orders/order-form"
import { PageHeader } from "@/components/page-header"

export function CreateOrderPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Create Order" />
      <OrderForm order={null} />
    </div>
  )
}
