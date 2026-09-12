import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import {
  ArrowUpDownIcon,
  CalendarIcon,
  CreditCardIcon,
  ListChecksIcon,
  PlusIcon,
  ReceiptTextIcon,
  StoreIcon,
  TagIcon,
  UserIcon,
  UserXIcon,
} from "lucide-react"
import type { DateRange } from "react-day-picker"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { ArrangeOrderDialog } from "@/components/orders/arrange-order-dialog"
import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog"
import { DeleteOrderDialog } from "@/components/orders/delete-order-dialog"
import { OrderTable } from "@/components/orders/order-table"
import { PAYMENT_STATUS_LABELS } from "@/components/orders/payment-status-badge"
import { RecordPaymentDialog } from "@/components/orders/record-payment-dialog"
import { RefundOrderDialog } from "@/components/orders/refund-order-dialog"
import { RequestOrDialog } from "@/components/orders/request-or-dialog"
import { ReturnOrderDialog } from "@/components/orders/return-order-dialog"
import {
  ACTIVE_FILTER_TRIGGER_CLASS,
  ActiveFilterChips,
  FilterSearchInput,
  FilterToolbar,
  type ActiveFilter,
} from "@/components/filter-toolbar"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { RefreshButton } from "@/components/refresh-button"
import { SortControl } from "@/components/sort-control"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { SPX_ADMIN_CREATE_ORDER_URL } from "@/lib/clipboard"
import { useOrderChannels } from "@/lib/order-channels"
import { useActiveOrderStatuses, useOrderStatusLookup } from "@/lib/order-statuses"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { cn } from "@/lib/utils"
import { useUserOptions } from "@/lib/users"
import {
  DEFAULT_ORDERS_PARAMS,
  PAYMENT_STATUSES,
  useOrderActions,
  useOrders,
  type Order,
  type OrRequestInput,
  type Payment,
  type PaymentStatus,
} from "@/lib/orders"

const ANY_STATUS = "All Statuses"
const ANY_PAYMENT_STATUS = "All Payment Statuses"
const ANY_CATEGORY = "All Categories"
const ANY_CREATED_BY = "All Creators"
const ANY_CHANNEL = "All Channels"
const ANY_OR = "Any OR Status"

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "order_number", label: "Order #" },
  { value: "customer_name", label: "Customer" },
  { value: "total", label: "Total" },
]

export function OrdersPage() {
  const navigate = useNavigate()
  const { hasPermission, role, user } = useAuth()
  const canManage = hasPermission("manage_orders")
  const { orders, total, params, setParams, refetch, isLoading, isFetching, isError, error } = useOrders()
  const { categories } = useCategories()
  const { statuses } = useActiveOrderStatuses()
  const { getLabel } = useOrderStatusLookup()
  const { orderChannels } = useOrderChannels()
  const { setOrderStatus, updateOrder, deleteOrder, saveOrRequest } = useOrderActions()
  // Fetched with includeInactive so a filter already applied to a former staff member's id still
  // resolves to their name (chip label, dropdown value) instead of falling back to the raw id.
  const { users: creatorOptionsRaw } = useUserOptions(true, true)
  const creatorLabel = (creator: { id: string; firstName: string; lastName: string }) =>
    creator.id === user?.id ? "Me" : `${creator.firstName} ${creator.lastName}`
  // Current user's own entry ("Me") always sorts last in the dropdown, everyone else keeps their existing order.
  const creatorOptions = [...creatorOptionsRaw].sort((a, b) =>
    a.id === user?.id ? 1 : b.id === user?.id ? -1 : 0
  )
  // Inactive/deleted users aren't offered as pickable filter options for staff, but admins/superadmins
  // can still filter by a former staff member's past orders — their name is suffixed "(Inactive)".
  const canSeeInactiveCreators = role === "admin" || role === "superadmin"
  const pickableCreatorOptions = canSeeInactiveCreators
    ? creatorOptions
    : creatorOptions.filter((creator) => creator.status === "active")
  const getCreatedByLabel = (id: string) => {
    const creator = creatorOptions.find((candidate) => candidate.id === id)
    return creator ? creatorLabel(creator) : id
  }
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [arrangingOrder, setArrangingOrder] = useState<Order | null>(null)
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null)
  const [returningOrder, setReturningOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)
  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [payingTargetStatus, setPayingTargetStatus] = useState<"paid" | "partially_paid" | null>(null)
  const [requestingOrOrder, setRequestingOrOrder] = useState<Order | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isSavingOrRequest, setIsSavingOrRequest] = useState(false)

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

  function handleConfirmArrange(_order: Order) {
    window.open(SPX_ADMIN_CREATE_ORDER_URL, "_blank", "noopener,noreferrer")
    setArrangingOrder(null)
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

  async function handleConfirmReturn(order: Order) {
    setIsReturning(true)
    try {
      await setOrderStatus(order.id, "returned")
      toast.success("Order returned.")
      setReturningOrder(null)
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to return order.")
    } finally {
      setIsReturning(false)
    }
  }

  async function handleConfirmPayment(order: Order, payment: Payment) {
    setIsPaying(true)
    try {
      await updateOrder(order.id, { payment })
      toast.success("Payment updated.")
      setPayingOrder(null)
      setPayingTargetStatus(null)
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update payment.")
    } finally {
      setIsPaying(false)
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

  async function handleConfirmRequestOr(order: Order, input: OrRequestInput) {
    setIsSavingOrRequest(true)
    try {
      await saveOrRequest(order.id, input)
      toast.success(order.orRequest ? "OR request updated." : "OR request saved.")
      setRequestingOrOrder(null)
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save OR request.")
    } finally {
      setIsSavingOrRequest(false)
    }
  }

  const hasActiveFilters =
    params.search !== "" ||
    params.status !== "" ||
    params.paymentStatus !== "" ||
    params.category !== "" ||
    params.createdBy !== "" ||
    params.dateFrom !== "" ||
    params.dateTo !== "" ||
    params.channel !== "" ||
    params.hasOr !== "" ||
    params.sortBy !== "created_at" ||
    params.sortDir !== "desc"

  function clearFilters() {
    setSearchInput("")
    setParams(DEFAULT_ORDERS_PARAMS)
  }

  const dateRange: DateRange | undefined =
    params.dateFrom || params.dateTo
      ? {
          from: params.dateFrom ? parseISO(params.dateFrom) : undefined,
          to: params.dateTo ? parseISO(params.dateTo) : undefined,
        }
      : undefined

  function handleDateRangeSelect(range: DateRange | undefined) {
    setParams({
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : "",
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : "",
      page: 1,
    })
  }

  function formatDateRangeLabel(range: DateRange | undefined) {
    if (!range?.from) return "Select date range"
    if (!range.to) return `${format(range.from, "MMM d, yyyy")} – …`
    return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
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
      label: getLabel(params.status),
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
    params.createdBy && {
      key: "createdBy",
      label: `Created by: ${getCreatedByLabel(params.createdBy)}`,
      onRemove: () => setParams({ createdBy: "", page: 1 }),
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
    params.channel && {
      key: "channel",
      label: params.channel,
      onRemove: () => setParams({ channel: "", page: 1 }),
    },
    params.hasOr && {
      key: "hasOr",
      label: params.hasOr === "true" ? "With OR" : "Without OR",
      onRemove: () => setParams({ hasOr: "", page: 1 }),
    },
  ].filter((filter): filter is ActiveFilter => Boolean(filter))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Orders"
        description="Manage customer orders"
        actions={
          <>
            <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
            {canManage ? (
              <Button onClick={() => navigate("/orders/new")}>
                <PlusIcon data-icon="inline-start" />
                New Order
              </Button>
            ) : undefined}
          </>
        }
      />

      <FilterToolbar className="flex-col items-stretch gap-3">
        <FilterSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search order #, customer, notes..."
          disabled={isLoading || isError}
          className="w-full"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={params.status || ANY_STATUS}
            onValueChange={(value) =>
              setParams({ status: value === ANY_STATUS ? "" : (value ?? ""), page: 1 })
            }
            disabled={isLoading || isError}
          >
            <SelectTrigger
              aria-label="Filter by status"
              title="Status"
              className={cn("min-w-40 flex-1", params.status && ACTIVE_FILTER_TRIGGER_CLASS)}
            >
              <ListChecksIcon className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue>
                {(value: string | null) => (value && getLabel(value)) || ANY_STATUS}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_STATUS}>{ANY_STATUS}</SelectItem>
              {statuses.map((item) => (
                <SelectItem key={item.id} value={item.name}>
                  {getLabel(item.name)}
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
            <SelectTrigger
              aria-label="Filter by payment status"
              title="Payment"
              className={cn("min-w-40 flex-1", params.paymentStatus && ACTIVE_FILTER_TRIGGER_CLASS)}
            >
              <CreditCardIcon className="size-4 shrink-0 text-muted-foreground" />
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
            <SelectTrigger
              aria-label="Filter by category"
              title="Category"
              className={cn("min-w-40 flex-1", params.category && ACTIVE_FILTER_TRIGGER_CLASS)}
            >
              <TagIcon className="size-4 shrink-0 text-muted-foreground" />
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

          <Select
            value={params.createdBy || ANY_CREATED_BY}
            onValueChange={(value) =>
              setParams({ createdBy: value === ANY_CREATED_BY ? "" : (value ?? ""), page: 1 })
            }
            disabled={isLoading || isError}
          >
            <SelectTrigger
              aria-label="Filter by creator"
              title="Created By"
              className={cn("min-w-40 flex-1", params.createdBy && ACTIVE_FILTER_TRIGGER_CLASS)}
            >
              <UserIcon className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === ANY_CREATED_BY) return ANY_CREATED_BY
                  const creator = creatorOptions.find((candidate) => candidate.id === value)
                  return (
                    <span className="flex items-center gap-1.5">
                      {getCreatedByLabel(value)}
                      {creator && creator.status !== "active" ? (
                        <UserXIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Inactive user" />
                      ) : null}
                    </span>
                  )
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_CREATED_BY}>{ANY_CREATED_BY}</SelectItem>
              {pickableCreatorOptions.map((creator) => (
                <SelectItem key={creator.id} value={creator.id}>
                  {creatorLabel(creator)}
                  {creator.status !== "active" ? (
                    <UserXIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Inactive user" />
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={params.channel || ANY_CHANNEL}
            onValueChange={(value) =>
              setParams({ channel: value === ANY_CHANNEL ? "" : (value ?? ""), page: 1 })
            }
            disabled={isLoading || isError}
          >
            <SelectTrigger
              aria-label="Filter by channel"
              title="Channel"
              className={cn("min-w-40 flex-1", params.channel && ACTIVE_FILTER_TRIGGER_CLASS)}
            >
              <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_CHANNEL}>{ANY_CHANNEL}</SelectItem>
              {orderChannels.map((channel) => (
                <SelectItem key={channel.id} value={channel.name}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={params.hasOr === "true" ? "With OR" : params.hasOr === "false" ? "Without OR" : ANY_OR}
            onValueChange={(value) =>
              setParams({ hasOr: value === "with" ? "true" : value === "without" ? "false" : "", page: 1 })
            }
            disabled={isLoading || isError}
          >
            <SelectTrigger
              aria-label="Filter by OR status"
              title="OR Status"
              className={cn("min-w-40 flex-1", params.hasOr && ACTIVE_FILTER_TRIGGER_CLASS)}
            >
              <ReceiptTextIcon className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_OR}>{ANY_OR}</SelectItem>
              <SelectItem value="with">With OR</SelectItem>
              <SelectItem value="without">Without OR</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger
              disabled={isLoading || isError}
              aria-label="Filter by date range"
              title="Date range"
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 min-w-56 flex-1 justify-start font-normal",
                    dateRange && ACTIVE_FILTER_TRIGGER_CLASS
                  )}
                />
              }
            >
              <CalendarIcon data-icon="inline-start" />
              {formatDateRangeLabel(dateRange)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                disabled={{ after: new Date() }}
                resetOnSelect
                autoFocus
              />
            </PopoverContent>
          </Popover>

          <div className="flex min-w-40 flex-1 items-center gap-1.5" title="Sort">
            <ArrowUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <SortControl
              value={params.sortBy}
              direction={params.sortDir}
              options={SORT_OPTIONS}
              onChange={(sortBy, sortDir) => setParams({ sortBy, sortDir, page: 1 })}
              disabled={isLoading || isError}
              className="min-w-0 flex-1"
            />
          </div>
        </div>

        <ActiveFilterChips
          filters={activeFilters}
          onClearAll={hasActiveFilters ? clearFilters : undefined}
          disabled={isLoading || isError}
          label="Active filters:"
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
        onReturn={setReturningOrder}
        onDelete={setDeletingOrder}
        onArrange={setArrangingOrder}
        onRequestPayment={(order, targetStatus) => {
          setPayingOrder(order)
          setPayingTargetStatus(targetStatus)
        }}
        onRequestOR={setRequestingOrOrder}
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

      <ArrangeOrderDialog
        order={arrangingOrder}
        onOpenChange={(open) => !open && setArrangingOrder(null)}
        onConfirm={handleConfirmArrange}
      />

      <RefundOrderDialog
        order={refundingOrder}
        isPending={isRefunding}
        onOpenChange={(open) => !open && setRefundingOrder(null)}
        onConfirm={handleConfirmRefund}
      />

      <ReturnOrderDialog
        order={returningOrder}
        isPending={isReturning}
        onOpenChange={(open) => !open && setReturningOrder(null)}
        onConfirm={handleConfirmReturn}
      />

      <DeleteOrderDialog
        order={deletingOrder}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
        onConfirm={handleConfirmDelete}
      />

      <RecordPaymentDialog
        order={payingOrder}
        targetStatus={payingTargetStatus}
        isPending={isPaying}
        onOpenChange={(open) => {
          if (!open) {
            setPayingOrder(null)
            setPayingTargetStatus(null)
          }
        }}
        onConfirm={handleConfirmPayment}
      />

      <RequestOrDialog
        order={requestingOrOrder}
        isPending={isSavingOrRequest}
        onOpenChange={(open) => !open && setRequestingOrOrder(null)}
        onConfirm={handleConfirmRequestOr}
      />
    </div>
  )
}
