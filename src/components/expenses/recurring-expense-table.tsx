import { CalendarCogIcon, Loader2Icon, PauseIcon, PencilIcon, PlayIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { RECURRENCE_FREQUENCY_LABELS, type RecurringExpense } from "@/lib/expenses"
import { formatCurrency, formatDate } from "@/lib/utils"

export function RecurringExpenseTable({
  recurring,
  isLoading,
  isError,
  error,
  togglingId,
  onCreate,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  recurring: RecurringExpense[]
  isLoading?: boolean
  isError?: boolean
  error?: string | null
  togglingId?: string | null
  onCreate?: () => void
  onEdit: (recurring: RecurringExpense) => void
  onDelete: (recurring: RecurringExpense) => void
  onToggleActive: (recurring: RecurringExpense) => void
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
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
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-7 w-24" />
                </TableCell>
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
          <EmptyTitle>Couldn't load recurring expenses</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (recurring.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarCogIcon />
          </EmptyMedia>
          <EmptyTitle>No recurring expenses yet</EmptyTitle>
          <EmptyDescription>
            Set up a schedule for expenses that repeat, like rent or subscriptions.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={onCreate}>
            <PlusIcon data-icon="inline-start" />
            Add Recurring Expense
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recurring.map((item) => {
            const isToggling = togglingId === item.id
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.category}</TableCell>
                <TableCell className="text-muted-foreground">{item.paymentMethod}</TableCell>
                <TableCell>{formatCurrency(item.amount)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {RECURRENCE_FREQUENCY_LABELS[item.frequency]}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.nextRunDate)}</TableCell>
                <TableCell>
                  <Badge variant={item.active ? "success" : "secondary"}>
                    {item.active ? "Active" : "Paused"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isToggling}
                      onClick={() => onToggleActive(item)}
                    >
                      {isToggling ? (
                        <Loader2Icon className="animate-spin" />
                      ) : item.active ? (
                        <PauseIcon />
                      ) : (
                        <PlayIcon />
                      )}
                      <span className="sr-only">{item.active ? "Pause" : "Resume"} schedule</span>
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)}>
                      <PencilIcon />
                      <span className="sr-only">Edit schedule</span>
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => onDelete(item)}>
                      <Trash2Icon />
                      <span className="sr-only">Delete schedule</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
