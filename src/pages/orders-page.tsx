import { useState } from "react"
import { PlusIcon, SearchIcon, XIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog"
import { DeleteOrderDialog } from "@/components/orders/delete-order-dialog"
import { ORDER_STATUS_LABELS } from "@/components/orders/order-status-badge"
import { OrderTable } from "@/components/orders/order-table"
import { PAYMENT_STATUS_LABELS } from "@/components/orders/payment-status-badge"
import { RefundOrderDialog } from "@/components/orders/refund-order-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  useOrders,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders"

const ANY_STATUS = "All Statuses"
const ANY_PAYMENT_STATUS = "All Payment Statuses"

export function OrdersPage() {
  const navigate = useNavigate()
  const { orders, setOrderStatus, deleteOrder, isLoading, isError, error } = useOrders()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState(ANY_STATUS)
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(ANY_PAYMENT_STATUS)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredOrders = orders.filter((order) => {
    const haystack = `${order.orderNumber} ${order.customerName}`.toLowerCase()
    const matchesSearch = haystack.includes(search.trim().toLowerCase())
    const matchesStatus = statusFilter === ANY_STATUS || order.status === statusFilter
    const matchesPaymentStatus =
      paymentStatusFilter === ANY_PAYMENT_STATUS || order.payment.status === paymentStatusFilter
    const matchesFrom = !dateFrom || order.createdAt >= dateFrom
    const matchesTo = !dateTo || order.createdAt <= `${dateTo}T23:59:59`
    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesFrom && matchesTo
  })

  async function handleConfirmCancel(order: Order) {
    setIsCancelling(true)
    try {
      await setOrderStatus(order.id, "cancelled")
      toast.success("Order cancelled.")
      setCancellingOrder(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to cancel order.")
    } finally {
      setIsCancelling(false)
    }
  }

  async function handleConfirmRefund(order: Order) {
    setIsRefunding(true)
    try {
      await setOrderStatus(order.id, "refunded")
      toast.success("Order refunded.")
      setRefundingOrder(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to refund order.")
    } finally {
      setIsRefunding(false)
    }
  }

  async function handleConfirmDelete(order: Order) {
    setIsDeleting(true)
    try {
      await deleteOrder(order.id)
      toast.success("Order deleted.")
      setDeletingOrder(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete order.")
    } finally {
      setIsDeleting(false)
    }
  }

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== ANY_STATUS ||
    paymentStatusFilter !== ANY_PAYMENT_STATUS ||
    dateFrom !== "" ||
    dateTo !== ""

  function clearFilters() {
    setSearch("")
    setStatusFilter(ANY_STATUS)
    setPaymentStatusFilter(ANY_PAYMENT_STATUS)
    setDateFrom("")
    setDateTo("")
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Orders"
        description="Manage customer orders"
        actions={
          <Button onClick={() => navigate("/orders/new")}>
            <PlusIcon data-icon="inline-start" />
            Create Order
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders..."
            className="pl-8"
            disabled={isLoading || isError}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value ?? ANY_STATUS)}
          disabled={isLoading || isError}
        >
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

        <Select
          value={paymentStatusFilter}
          onValueChange={(value) => setPaymentStatusFilter(value ?? ANY_PAYMENT_STATUS)}
          disabled={isLoading || isError}
        >
          <SelectTrigger>
            <SelectValue>
              {(value: string | null) =>
                (value && PAYMENT_STATUS_LABELS[value as PaymentStatus]) || ANY_PAYMENT_STATUS
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_PAYMENT_STATUS}>{ANY_PAYMENT_STATUS}</SelectItem>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          aria-label="Filter orders from date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="w-40"
          disabled={isLoading || isError}
        />
        <Input
          type="date"
          aria-label="Filter orders to date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="w-40"
          disabled={isLoading || isError}
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon data-icon="inline-start" />
            Clear filters
          </Button>
        )}
      </div>

      {!isLoading && !isError && (
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters
            ? `Showing ${filteredOrders.length} of ${orders.length} orders`
            : `${orders.length} orders`}
        </p>
      )}

      <OrderTable
        orders={filteredOrders}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onView={(order) => navigate(`/orders/${order.id}`)}
        onEdit={(order) => navigate(`/orders/${order.id}/edit`)}
        onCancel={setCancellingOrder}
        onRefund={setRefundingOrder}
        onDelete={setDeletingOrder}
      />

      <CancelOrderDialog
        order={cancellingOrder}
        isPending={isCancelling}
        onOpenChange={(open) => !open && setCancellingOrder(null)}
        onConfirm={handleConfirmCancel}
      />

      <RefundOrderDialog
        order={refundingOrder}
        isPending={isRefunding}
        onOpenChange={(open) => !open && setRefundingOrder(null)}
        onConfirm={handleConfirmRefund}
      />

      <DeleteOrderDialog
        order={deletingOrder}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
