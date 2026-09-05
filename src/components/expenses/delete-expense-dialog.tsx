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
    <AlertDialog open={!!expense} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete expense</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this{" "}
            <span className="font-medium text-foreground">
              {expense ? formatCurrency(expense.amount) : ""}
            </span>{" "}
            {expense?.category} expense? This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive-solid"
            disabled={isDeleting}
            onClick={() => expense && onConfirm(expense)}
          >
            {isDeleting && <Spinner data-icon="inline-start" />}
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
