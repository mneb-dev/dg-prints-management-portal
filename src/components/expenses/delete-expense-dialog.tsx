import { Trash2Icon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { Expense } from "@/lib/expenses"
import { formatCurrency } from "@/lib/utils"

export function DeleteExpenseDialog({
  expense,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  expense: Expense | null
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (expense: Expense) => void
}) {
  return (
    <ConfirmDialog
      open={!!expense}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={Trash2Icon}
      title={<>Delete this <Name>{expense ? formatCurrency(expense.amount) : ""}</Name> expense?</>}
      description={<>{expense?.category ? `${expense.category}. ` : ""}This can't be undone.</>}
      confirmLabel="Yes, delete it"
      pendingLabel="Deleting…"
      isPending={isDeleting}
      onConfirm={() => expense && onConfirm(expense)}
    />
  )
}
