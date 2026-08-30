import { useEffect, useState } from "react"
import { PlusIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog"
import { DeleteOrderDialog } from "@/components/orders/delete-order-dialog"
import { ORDER_STATUS_LABELS } from "@/components/orders/order-status-badge"
import { OrderTable } from "@/components/orders/order-table"
import { PAYMENT_STATUS_LABELS } from "@/components/orders/payment-status-badge"
import { RefundOrderDialog } from "@/components/orders/refund-order-dialog"
import { ActiveFilterChips, FilterSearchInput, FilterToolbar, type ActiveFilter } from "@/components/filter-toolbar"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { SortControl } from "@/components/sort-control"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  useOrderActions,
  useOrders,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders"
import { PRODUCT_CATEGORIES } from "@/lib/products"

const ANY_STATUS = "All Statuses"
const ANY_PAYMENT_STATUS = "All Payment Statuses"
const ANY_CATEGORY = "All Categories"

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "order_number", label: "Order #" },
  { value: "customer_name", label: "Customer" },
  { value: "total", label: "Total" },
]

export function OrdersPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_orders")
  const { orders, total, params, setParams, refetch, isLoading, isFetching, isError, error } = useOrders()
  const { setOrderStatus, deleteOrder } = useOrderActions()
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (debouncedSearch !== params.search) {
      setParams({ search: debouncedSearch, page: 1 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  async function handleConfirmCancel(order: Order) {
    setIsCancelling(true)
    try {
      await setOrderStatus(order.id, "cancelled")
      toast.success("Order cancelled.")
      setCancellingOrder(null)
      refetch()
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
      refetch()
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
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete order.")
    } finally {
      setIsDeleting(false)
    }
  }

  const hasActiveFilters =
    params.search !== "" ||
    params.status !== "" ||
    params.paymentStatus !== "" ||
    params.category !== "" ||
    params.dateFrom !== "" ||
    params.dateTo !== "" ||
    params.sortBy !== "created_at" ||
    params.sortDir !== "desc"

  function clearFilters() {
    setSearchInput("")
    setParams({
      search: "",
      status: "",
      paymentStatus: "",
      category: "",
      dateFrom: "",
      dateTo: "",
      sortBy: "created_at",
      sortDir: "desc",
      page: 1,
    })
  }

  const activeFilters: ActiveFilter[] = [
    params.search && {
      key: "search",
      label: `Search: "${params.search}"`,
      onRemove: () => {
        setSearchInput("")
        setParams({ search: "", page: 1 })
      },
    },
    params.status && {
      key: "status",
      label: ORDER_STATUS_LABELS[params.status as OrderStatus] ?? params.status,
      onRemove: () => setParams({ status: "", page: 1 }),
    },
    params.paymentStatus && {
      key: "paymentStatus",
      label: PAYMENT_STATUS_LABELS[params.paymentStatus as PaymentStatus] ?? params.paymentStatus,
      onRemove: () => setParams({ paymentStatus: "", page: 1 }),
    },
    params.category && {
      key: "category",
      label: params.category,
      onRemove: () => setParams({ category: "", page: 1 }),
    },
    params.dateFrom && {
      key: "dateFrom",
      label: `From: ${params.dateFrom}`,
      onRemove: () => setParams({ dateFrom: "", page: 1 }),
    },
    params.dateTo && {
      key: "dateTo",
      label: `To: ${params.dateTo}`,
      onRemove: () => setParams({ dateTo: "", page: 1 }),
    },
  ].filter((filter): filter is ActiveFilter => Boolean(filter))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Orders"
        description="Manage customer orders"
        actions={
          canManage ? (
            <Button onClick={() => navigate("/orders/new")}>
              <PlusIcon data-icon="inline-start" />
              Create Order
            </Button>
          ) : undefined
        }
      />

      <FilterToolbar>
        <FilterSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search order #, customer, description..."
          disabled={isLoading || isError}
        />

        <Select
          value={params.status || ANY_STATUS}
          onValueChange={(value) =>
            setParams({ status: value === ANY_STATUS ? "" : (value ?? ""), page: 1 })
          }
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
          value={params.paymentStatus || ANY_PAYMENT_STATUS}
          onValueChange={(value) =>
            setParams({ paymentStatus: value === ANY_PAYMENT_STATUS ? "" : (value ?? ""), page: 1 })
          }
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

        <Select
          value={params.category || ANY_CATEGORY}
          onValueChange={(value) =>
            setParams({ category: value === ANY_CATEGORY ? "" : (value ?? ""), page: 1 })
          }
          disabled={isLoading || isError}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_CATEGORY}>{ANY_CATEGORY}</SelectItem>
            {PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 rounded-lg border border-input px-2.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="orders-date-from" className="text-sm text-muted-foreground">
              From
            </Label>
            <Input
              id="orders-date-from"
              type="date"
              value={params.dateFrom}
              onChange={(event) => setParams({ dateFrom: event.target.value, page: 1 })}
              max={params.dateTo || undefined}
              className="w-36 border-0 px-0 focus-visible:ring-0"
              disabled={isLoading || isError}
            />
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Label htmlFor="orders-date-to" className="text-sm text-muted-foreground">
              To
            </Label>
            <Input
              id="orders-date-to"
              type="date"
              value={params.dateTo}
              onChange={(event) => setParams({ dateTo: event.target.value, page: 1 })}
              min={params.dateFrom || undefined}
              className="w-36 border-0 px-0 focus-visible:ring-0"
              disabled={isLoading || isError}
            />
          </div>
        </div>

        <SortControl
          value={params.sortBy}
          direction={params.sortDir}
          options={SORT_OPTIONS}
          onChange={(sortBy, sortDir) => setParams({ sortBy, sortDir, page: 1 })}
          disabled={isLoading || isError}
        />

        <ActiveFilterChips
          filters={activeFilters}
          onClearAll={hasActiveFilters ? clearFilters : undefined}
          disabled={isLoading || isError}
        />
      </FilterToolbar>

      <OrderTable
        orders={orders}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        hasActiveFilters={hasActiveFilters}
        searchTerm={params.search}
        canManage={canManage}
        onClearFilters={clearFilters}
        onCreate={() => navigate("/orders/new")}
        onView={(order) => navigate(`/orders/${order.id}`)}
        onEdit={(order) => navigate(`/orders/${order.id}/edit`)}
        onCancel={setCancellingOrder}
        onRefund={setRefundingOrder}
        onDelete={setDeletingOrder}
      />

      {total > 0 && (
        <PaginationBar
          page={params.page}
          pageSize={params.pageSize}
          total={total}
          itemLabel="orders"
          onPageChange={(page) => setParams({ page })}
          onPageSizeChange={(pageSize) => setParams({ pageSize, page: 1 })}
          disabled={isLoading || isFetching || isError}
        />
      )}

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
