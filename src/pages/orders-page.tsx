import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
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
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { useCategories } from "@/lib/categories"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import {
  DEFAULT_ORDERS_PARAMS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  useOrderActions,
  useOrders,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders"

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
  const { hasPermission, role } = useAuth()
  const canManage = hasPermission("manage_orders")
  const { orders, total, params, setParams, refetch, isLoading, isFetching, isError, error } = useOrders()
  const { categories } = useCategories()
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
    setParams(DEFAULT_ORDERS_PARAMS)
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
              New Order
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
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 rounded-lg border border-input px-2.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="orders-date-from" className="text-sm text-muted-foreground">
              From
            </Label>
            <Popover>
              <PopoverTrigger
                id="orders-date-from"
                disabled={isLoading || isError}
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-1.5 font-normal"
                  />
                }
              >
                <span className={params.dateFrom ? undefined : "text-muted-foreground"}>
                  {params.dateFrom ? format(parseISO(params.dateFrom), "MMM d, yyyy") : "Select date"}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={params.dateFrom ? parseISO(params.dateFrom) : undefined}
                  onSelect={(date) =>
                    setParams({ dateFrom: date ? format(date, "yyyy-MM-dd") : "", page: 1 })
                  }
                  disabled={params.dateTo ? { after: parseISO(params.dateTo) } : undefined}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Label htmlFor="orders-date-to" className="text-sm text-muted-foreground">
              To
            </Label>
            <Popover>
              <PopoverTrigger
                id="orders-date-to"
                disabled={isLoading || isError}
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-1.5 font-normal"
                  />
                }
              >
                <span className={params.dateTo ? undefined : "text-muted-foreground"}>
                  {params.dateTo ? format(parseISO(params.dateTo), "MMM d, yyyy") : "Select date"}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={params.dateTo ? parseISO(params.dateTo) : undefined}
                  onSelect={(date) =>
                    setParams({ dateTo: date ? format(date, "yyyy-MM-dd") : "", page: 1 })
                  }
                  disabled={params.dateFrom ? { before: parseISO(params.dateFrom) } : undefined}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
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
        role={role}
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
