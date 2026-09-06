import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Expense } from "@/lib/expenses"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

export function ExpenseTable({
  expenses,
  isLoading,
  isFetching,
  isError,
  error,
  hasActiveFilters,
  searchTerm,
  canManage,
  onClearFilters,
  onCreate,
  onEdit,
  onDelete,
}: {
  expenses: Expense[]
  isLoading?: boolean
  isFetching?: boolean
  isError?: boolean
  error?: string | null
  hasActiveFilters?: boolean
  searchTerm?: string
  canManage?: boolean
  onClearFilters?: () => void
  onCreate?: () => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Notes</TableHead>
              {canManage && <TableHead>Created By</TableHead>}
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                )}
                {canManage && (
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-7 w-16" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Couldn't load expenses</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (expenses.length === 0) {
    if (hasActiveFilters) {
      return (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptTextIcon />
            </EmptyMedia>
            <EmptyTitle>No expenses match your {searchTerm ? "search" : "filters"}</EmptyTitle>
            <EmptyDescription>
              {searchTerm
                ? `No results for "${searchTerm}". Try a different search or clear your filters.`
                : "Try adjusting or clearing your filters."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <XIcon data-icon="inline-start" />
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )
    }
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ReceiptTextIcon />
          </EmptyMedia>
          <EmptyTitle>No expenses yet</EmptyTitle>
          <EmptyDescription>Get started by logging your first expense.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={onCreate}>
            <PlusIcon data-icon="inline-start" />
            Add Expense
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="relative" aria-busy={isFetching}>
      <div className={cn("rounded-lg border", isFetching && "opacity-60 transition-opacity duration-150")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Notes</TableHead>
              {canManage && <TableHead>Created By</TableHead>}
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{formatDate(expense.date)}</TableCell>
                <TableCell className="text-muted-foreground">{expense.category}</TableCell>
                <TableCell className="text-muted-foreground">{expense.paymentMethod}</TableCell>
                <TableCell>{formatCurrency(expense.amount)}</TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground">
                  {expense.notes || "—"}
                </TableCell>
                {canManage && (
                  <TableCell className="text-muted-foreground">
                    {expense.createdByName || "—"}
                  </TableCell>
                )}
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => onEdit(expense)}>
                        <PencilIcon />
                        <span className="sr-only">Edit expense</span>
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => onDelete(expense)}>
                        <Trash2Icon />
                        <span className="sr-only">Delete expense</span>
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {isFetching && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border">
          <Loader2Icon className="size-3.5 animate-spin" />
          Updating…
        </div>
      )}
    </div>
  )
}
