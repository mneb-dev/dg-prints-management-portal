import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { CalendarCogIcon, PlusIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { DeleteExpenseDialog } from "@/components/expenses/delete-expense-dialog"
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { ExpenseTable } from "@/components/expenses/expense-table"
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
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, useExpenseActions, useExpenses, type Expense } from "@/lib/expenses"
import { useDebouncedValue } from "@/lib/use-debounced-value"

const ANY_CATEGORY = "All Categories"
const ANY_METHOD = "All Payment Methods"

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "category", label: "Category" },
  { value: "created_at", label: "Date Logged" },
]

export function ExpensesPage() {
  const { role } = useAuth()
  const canManage = role === "admin" || role === "superadmin"
  const navigate = useNavigate()
  const { expenses, total, params, setParams, refetch, isLoading, isFetching, isError, error } = useExpenses()
  const { deleteExpense } = useExpenseActions()
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)

  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
        actions={
          <>
            {canManage && (
              <Button variant="outline" onClick={() => navigate("/expenses/recurring")}>
                <CalendarCogIcon data-icon="inline-start" />
                Manage Recurring
              </Button>
            )}
            <Button onClick={handleAdd}>
              <PlusIcon data-icon="inline-start" />
              Add Expense
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
            {EXPENSE_PAYMENT_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 rounded-lg border border-input px-2.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="expenses-date-from" className="text-sm text-muted-foreground">
              From
            </Label>
            <Popover>
              <PopoverTrigger
                id="expenses-date-from"
                disabled={isLoading || isError}
                render={<Button variant="ghost" size="sm" className="h-8 px-1.5 font-normal" />}
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
            <Label htmlFor="expenses-date-to" className="text-sm text-muted-foreground">
              To
            </Label>
            <Popover>
              <PopoverTrigger
                id="expenses-date-to"
                disabled={isLoading || isError}
                render={<Button variant="ghost" size="sm" className="h-8 px-1.5 font-normal" />}
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
      />

      {total > 0 && (
        <PaginationBar
          page={params.page}
          pageSize={params.pageSize}
          total={total}
          itemLabel="expenses"
          onPageChange={(page) => setParams({ page })}
          onPageSizeChange={(pageSize) => setParams({ pageSize, page: 1 })}
          disabled={isLoading || isFetching || isError}
        />
      )}

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
    </div>
  )
}
