import { useState } from "react"
import { ArrowLeftIcon, PlusIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { DeleteRecurringExpenseDialog } from "@/components/expenses/delete-recurring-expense-dialog"
import { RecurringExpenseFormDialog } from "@/components/expenses/recurring-expense-form-dialog"
import { RecurringExpenseTable } from "@/components/expenses/recurring-expense-table"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { Button } from "@/components/ui/button"
import { useRecurringExpenseActions, useRecurringExpenses, type RecurringExpense } from "@/lib/expenses"
import { useClampPage } from "@/lib/pagination"

export function RecurringExpensesPage() {
  const navigate = useNavigate()
  const { recurring, total, activeCount, params, setParams, refetch, isLoading, isFetching, isError, error } =
    useRecurringExpenses()
  useClampPage(params.page, params.pageSize, total, isFetching, (page) => setParams({ page }))
  const { setRecurringExpenseActive, deleteRecurringExpense } = useRecurringExpenseActions()

  const [formOpen, setFormOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null)
  const [deletingRecurring, setDeletingRecurring] = useState<RecurringExpense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function handleAdd() {
    setEditingRecurring(null)
    setFormOpen(true)
  }

  function handleEdit(recurring: RecurringExpense) {
    setEditingRecurring(recurring)
    setFormOpen(true)
  }

  async function handleToggleActive(recurring: RecurringExpense) {
    setTogglingId(recurring.id)
    try {
      await setRecurringExpenseActive(recurring.id, !recurring.active)
      toast.success(recurring.active ? "Schedule paused." : "Schedule resumed.")
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update schedule.")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleConfirmDelete(recurring: RecurringExpense) {
    setIsDeleting(true)
    try {
      await deleteRecurringExpense(recurring.id)
      toast.success("Recurring expense deleted.")
      setDeletingRecurring(null)
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete recurring expense.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Recurring expenses"
        description={
          isLoading || isError || total === 0
            ? "Expenses that repeat automatically on a schedule."
            : `${total} ${total === 1 ? "schedule" : "schedules"} · ${activeCount} active`
        }
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/expenses")}>
              <ArrowLeftIcon data-icon="inline-start" />
              Expenses
            </Button>
            <Button onClick={handleAdd}>
              <PlusIcon data-icon="inline-start" />
              Add recurring expense
            </Button>
          </>
        }
      />

      <RecurringExpenseTable
        recurring={recurring}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        togglingId={togglingId}
        onCreate={handleAdd}
        onEdit={handleEdit}
        onDelete={setDeletingRecurring}
        onToggleActive={handleToggleActive}
        footer={
          total > 0 && (
            <PaginationBar
              page={params.page}
              pageSize={params.pageSize}
              total={total}
              itemLabel="schedules"
              onPageChange={(page) => setParams({ page })}
              onPageSizeChange={(pageSize) => setParams({ pageSize, page: 1 })}
              disabled={isLoading || isFetching || isError}
            />
          )
        }
      />

      <RecurringExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        recurringExpense={editingRecurring}
        onSaved={refetch}
      />

      <DeleteRecurringExpenseDialog
        recurringExpense={deletingRecurring}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeletingRecurring(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
