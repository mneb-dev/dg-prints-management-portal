import { OrderForm } from "@/components/orders/order-form"

export function CreateOrderPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Create Order</h1>
      <OrderForm order={null} />
    </div>
  )
}
