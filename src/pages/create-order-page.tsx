import { useLocation } from "react-router-dom"

import { OrderForm, type OrderFormSeed } from "@/components/orders/order-form"
import { PageHeader } from "@/components/page-header"

export function CreateOrderPage() {
  const location = useLocation()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Create Order" />
      <OrderForm order={null} initialValues={location.state as OrderFormSeed | undefined} />
    </div>
  )
}
