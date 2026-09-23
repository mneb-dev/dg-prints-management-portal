import { useState } from "react"
import { ArrowLeftIcon, PlusIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { DeleteRecurringExpenseDialog } from "@/components/expenses/delete-recurring-expense-dialog"
import { RecurringExpenseFormDialog } from "@/components/expenses/recurring-expense-form-dialog"
import { RecurringExpenseTable } from "@/components/expenses/recurring-expense-table"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useRecurringExpenseActions, useRecurringExpenses, type RecurringExpense } from "@/lib/expenses"

export function RecurringExpensesPage() {
  const navigate = useNavigate()
  const { recurring, isLoading, isError, error } = useRecurringExpenses()
  const { setRecurringExpenseActive, deleteRecurringExpense } = useRecurringExpenseActions()

  const [formOpen, setFormOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null)
  const [deletingRecurring, setDeletingRecurring] = useState<RecurringExpense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const activeCount = recurring.filter((item) => item.active).length

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
          isLoading || isError || recurring.length === 0
            ? "Expenses that repeat automatically on a schedule."
            : `${recurring.length} ${recurring.length === 1 ? "schedule" : "schedules"} · ${activeCount} active`
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
        isError={isError}
        error={error}
        togglingId={togglingId}
        onCreate={handleAdd}
        onEdit={handleEdit}
        onDelete={setDeletingRecurring}
        onToggleActive={handleToggleActive}
      />

      <RecurringExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        recurringExpense={editingRecurring}
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
