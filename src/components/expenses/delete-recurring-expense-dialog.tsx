import { Trash2Icon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { RecurringExpense } from "@/lib/expenses"
import { formatCurrency } from "@/lib/utils"

export function DeleteRecurringExpenseDialog({
  recurringExpense,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  recurringExpense: RecurringExpense | null
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (recurringExpense: RecurringExpense) => void
}) {
  return (
    <ConfirmDialog
      open={!!recurringExpense}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={Trash2Icon}
      title={<>Delete the <Name>{recurringExpense ? formatCurrency(recurringExpense.amount) : ""}</Name> {recurringExpense?.category} schedule?</>}
      description={"It stops creating new expenses. Ones it already created stay."}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      isPending={isDeleting}
      onConfirm={() => recurringExpense && onConfirm(recurringExpense)}
    />
  )
}
