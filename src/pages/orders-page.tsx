import { useState } from "react"
import { PlusIcon, SearchIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog"
import { DeleteOrderDialog } from "@/components/orders/delete-order-dialog"
import { ORDER_STATUS_LABELS } from "@/components/orders/order-status-badge"
import { OrderTable } from "@/components/orders/order-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ORDER_STATUSES, useOrders, type Order, type OrderStatus } from "@/lib/orders"

const ANY_STATUS = "All Statuses"

export function OrdersPage() {
  const navigate = useNavigate()
  const { orders, setOrderStatus, deleteOrder } = useOrders()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState(ANY_STATUS)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)

  const filteredOrders = orders.filter((order) => {
    const haystack = `${order.orderNumber} ${order.customerName}`.toLowerCase()
    const matchesSearch = haystack.includes(search.trim().toLowerCase())
    const matchesStatus = statusFilter === ANY_STATUS || order.status === statusFilter
    const matchesFrom = !dateFrom || order.createdAt >= dateFrom
    const matchesTo = !dateTo || order.createdAt <= `${dateTo}T23:59:59`
    return matchesSearch && matchesStatus && matchesFrom && matchesTo
  })

  function handleConfirmCancel(order: Order) {
    setOrderStatus(order.id, "cancelled")
    toast.success("Order cancelled.")
    setCancellingOrder(null)
  }

  function handleConfirmDelete(order: Order) {
    deleteOrder(order.id)
    toast.success("Order deleted.")
    setDeletingOrder(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders</p>
        </div>
        <Button onClick={() => navigate("/orders/new")}>
          <PlusIcon data-icon="inline-start" />
          Create Order
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders..."
            className="pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? ANY_STATUS)}>
          <SelectTrigger>
            <SelectValue>
              {(value: string | null) =>
                (value && ORDER_STATUS_LABELS[value as OrderStatus]) || ANY_STATUS
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_STATUS}>{ANY_STATUS}</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="w-40"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="w-40"
        />
      </div>

      <OrderTable
        orders={filteredOrders}
        onView={(order) => navigate(`/orders/${order.id}`)}
        onEdit={(order) => navigate(`/orders/${order.id}/edit`)}
        onCancel={setCancellingOrder}
        onDelete={setDeletingOrder}
      />

      <CancelOrderDialog
        order={cancellingOrder}
        onOpenChange={(open) => !open && setCancellingOrder(null)}
        onConfirm={handleConfirmCancel}
      />

      <DeleteOrderDialog
        order={deletingOrder}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
