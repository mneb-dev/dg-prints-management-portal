import { Trash2Icon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
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
    <AlertDialog open={!!recurringExpense} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete recurring expense</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this{" "}
            <span className="font-medium text-foreground">
              {recurringExpense ? formatCurrency(recurringExpense.amount) : ""}
            </span>{" "}
            {recurringExpense?.category} schedule? It will stop generating new expenses, but
            expenses it already created will stay. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive-solid"
            disabled={isDeleting}
            onClick={() => recurringExpense && onConfirm(recurringExpense)}
          >
            {isDeleting && <Spinner data-icon="inline-start" />}
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
