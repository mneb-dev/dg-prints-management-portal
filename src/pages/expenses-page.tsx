import { useEffect, useState } from "react"
import { CalendarCogIcon, HandCoinsIcon, PlusIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { DateRangeFilter } from "@/components/date-range-filter"
import { DeleteExpenseDialog } from "@/components/expenses/delete-expense-dialog"
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { ExpenseTable } from "@/components/expenses/expense-table"
import { RunPayrollDialog } from "@/components/expenses/run-payroll-dialog"
import { ActiveFilterChips, FilterSearchInput, FilterToolbar, type ActiveFilter } from "@/components/filter-toolbar"
import { ResponsiveFilters } from "@/components/responsive-filters"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { SortControl } from "@/components/sort-control"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { EXPENSE_CATEGORIES, useExpenseActions, useExpenses, type Expense } from "@/lib/expenses"
import { useClampPage } from "@/lib/pagination"
import { usePaymentMethods } from "@/lib/payment-methods"
import { useUserOptions } from "@/lib/users"
import { useDebouncedValue } from "@/lib/use-debounced-value"

const ANY_CATEGORY = "All categories"
const ANY_METHOD = "All payment methods"
const ANY_CREATOR = "Anyone"

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "category", label: "Category" },
  { value: "created_at", label: "Date logged" },
]

export function ExpensesPage() {
  const { role } = useAuth()
  const canManage = role === "admin" || role === "superadmin"
  const navigate = useNavigate()
  const { expenses, total, params, setParams, refetch, isLoading, isFetching, isError, error } = useExpenses()
  useClampPage(params.page, params.pageSize, total, isFetching, (page) => setParams({ page }))
  const { deleteExpense } = useExpenseActions()
  const { paymentMethods } = usePaymentMethods()
  // Includes inactive users so a former staff member's past expenses can still be isolated.
  const { users: creatorOptions } = useUserOptions(canManage, true)
  const creatorName = (id: string) => {
    const user = creatorOptions.find((option) => option.id === id)
    return user ? `${user.firstName} ${user.lastName}` : "Selected user"
  }
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)

  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [runPayrollOpen, setRunPayrollOpen] = useState(false)

  useEffect(() => {
    if (debouncedSearch !== params.search) {
      setParams({ search: debouncedSearch, page: 1 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const hasActiveFilters =
    params.search !== "" ||
    params.category !== "" ||
    params.paymentMethod !== "" ||
    params.dateFrom !== "" ||
    params.dateTo !== "" ||
    params.createdBy !== "" ||
    params.sortBy !== "date" ||
    params.sortDir !== "desc"

  function clearFilters() {
    setSearchInput("")
    setParams({
      search: "",
      category: "",
      paymentMethod: "",
      dateFrom: "",
      dateTo: "",
      createdBy: "",
      sortBy: "date",
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
    params.category && {
      key: "category",
      label: params.category,
      onRemove: () => setParams({ category: "", page: 1 }),
    },
    params.paymentMethod && {
      key: "paymentMethod",
      label: params.paymentMethod,
      onRemove: () => setParams({ paymentMethod: "", page: 1 }),
    },
    canManage &&
      params.createdBy && {
        key: "createdBy",
        label: `Created by: ${creatorName(params.createdBy)}`,
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
  ].filter((filter): filter is ActiveFilter => Boolean(filter))
  // What the phone "Filters" button badges: everything except the always-visible search.
  const secondaryFilterCount = activeFilters.filter((filter) => filter.key !== "search").length

  function handleAdd() {
    setEditingExpense(null)
    setFormOpen(true)
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense)
    setFormOpen(true)
  }

  async function handleConfirmDelete(expense: Expense) {
    setIsDeleting(true)
    try {
      await deleteExpense(expense.id)
      toast.success("Expense deleted.")
      setDeletingExpense(null)
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete expense.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Expenses"
        description={
          isLoading || isError
            ? "Business spending and payroll"
            : `${total.toLocaleString()} ${total === 1 ? "expense" : "expenses"}`
        }
        actions={
          <>
            {canManage && (
              <Button
                variant="outline"
                aria-label="Recurring expenses"
                onClick={() => navigate("/expenses/recurring")}
              >
                <CalendarCogIcon data-icon="inline-start" />
                <span className="hidden sm:inline">Recurring</span>
              </Button>
            )}
            {canManage && (
              <Button variant="outline" aria-label="Run payroll" onClick={() => setRunPayrollOpen(true)}>
                <HandCoinsIcon data-icon="inline-start" />
                <span className="hidden sm:inline">Run payroll</span>
              </Button>
            )}
            <Button onClick={handleAdd}>
              <PlusIcon data-icon="inline-start" />
              Add expense
            </Button>
          </>
        }
      />

      <FilterToolbar>
        <FilterSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search expenses..."
          disabled={isLoading || isError}
        />

        <ResponsiveFilters activeCount={secondaryFilterCount} onClearAll={hasActiveFilters ? clearFilters : undefined} disabled={isLoading || isError}>
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
            <SelectContent className="min-w-64">
              <SelectItem value={ANY_CATEGORY}>{ANY_CATEGORY}</SelectItem>
              {EXPENSE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={params.paymentMethod || ANY_METHOD}
            onValueChange={(value) =>
              setParams({ paymentMethod: value === ANY_METHOD ? "" : (value ?? ""), page: 1 })
            }
            disabled={isLoading || isError}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_METHOD}>{ANY_METHOD}</SelectItem>
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.name}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManage && (
            <Select
              value={params.createdBy || ANY_CREATOR}
              onValueChange={(value) =>
                setParams({ createdBy: value === ANY_CREATOR ? "" : (value ?? ""), page: 1 })
              }
              disabled={isLoading || isError}
            >
              <SelectTrigger aria-label="Filter by created by" className="shrink-0 sm:min-w-44">
                <SelectValue>
                  {(value: string | null) => `Created by: ${value && value !== ANY_CREATOR ? creatorName(value) : ANY_CREATOR}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-56" alignItemWithTrigger={false}>
                <SelectItem value={ANY_CREATOR}>{ANY_CREATOR}</SelectItem>
                {creatorOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id} className="whitespace-nowrap">
                    {user.firstName} {user.lastName}
                    {user.status !== "active" && <span className="text-xs text-muted-foreground">Inactive</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DateRangeFilter
            id="expenses-date-range"
            from={params.dateFrom}
            to={params.dateTo}
            onChange={(dateFrom, dateTo) => setParams({ dateFrom, dateTo, page: 1 })}
            disabled={isLoading || isError}
          />

          <SortControl
            value={params.sortBy}
            direction={params.sortDir}
            options={SORT_OPTIONS}
            onChange={(sortBy, sortDir) => setParams({ sortBy, sortDir, page: 1 })}
            disabled={isLoading || isError}
          />
        </ResponsiveFilters>

        <ActiveFilterChips
          filters={activeFilters}
          onClearAll={hasActiveFilters ? clearFilters : undefined}
          disabled={isLoading || isError}
        />
      </FilterToolbar>

      <ExpenseTable
        expenses={expenses}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        hasActiveFilters={hasActiveFilters}
        searchTerm={params.search}
        canManage={canManage}
        onClearFilters={clearFilters}
        onCreate={handleAdd}
        onEdit={handleEdit}
        onDelete={setDeletingExpense}
        footer={
          total > 0 && (
            <PaginationBar
              page={params.page}
              pageSize={params.pageSize}
              total={total}
              itemLabel="expenses"
              onPageChange={(page) => setParams({ page })}
              onPageSizeChange={(pageSize) => setParams({ pageSize, page: 1 })}
              disabled={isLoading || isFetching || isError}
            />
          )
        }
      />

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editingExpense}
        onSaved={refetch}
      />

      <DeleteExpenseDialog
        expense={deletingExpense}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
        onConfirm={handleConfirmDelete}
      />

      <RunPayrollDialog open={runPayrollOpen} onOpenChange={setRunPayrollOpen} onCreated={refetch} />
    </div>
  )
}
