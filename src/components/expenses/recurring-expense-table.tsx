import { type MouseEvent, type ReactNode } from "react"
import {
  CalendarCogIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { TABLE_HEAD_CLASS, TABLE_HEADER_CLASS, TABLE_SURFACE_CLASS } from "@/components/table-surface"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RECURRENCE_FREQUENCY_LABELS, type RecurringExpense } from "@/lib/expenses"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

function Columns() {
  return (
    <TableHeader className={TABLE_HEADER_CLASS}>
      <TableRow className="hover:bg-transparent">
        <TableHead className={TABLE_HEAD_CLASS}>Expense</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Schedule</TableHead>
        <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Amount</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
        <TableHead className={cn(TABLE_HEAD_CLASS, "w-0 text-right")}>
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation()
}

/** Neutral chip + dot, like every other status chip in the app (docs/design-system.md). */
function ScheduleStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant="secondary" className="gap-1.5">
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 translate-y-px rounded-full",
          active ? "bg-order-status-teal" : "bg-muted-foreground/40"
        )}
      />
      <span className="leading-none">{active ? "Active" : "Paused"}</span>
    </Badge>
  )
}

export function RecurringExpenseTable({
  footer,
  recurring,
  isLoading,
  isFetching,
  isError,
  error,
  togglingId,
  onCreate,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  /** Rendered inside the table surface, below the rows (the pager). Hidden in loading/empty/error states. */
  footer?: ReactNode
  recurring: RecurringExpense[]
  isLoading?: boolean
  isFetching?: boolean
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
      <div className={TABLE_SURFACE_CLASS}>
        <Table>
          <Columns />
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="px-4">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="ml-auto h-4 w-20" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex justify-end gap-1">
                    <Skeleton className="size-7 rounded-md" />
                    <Skeleton className="size-7 rounded-md" />
                  </div>
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
      <Empty className={TABLE_SURFACE_CLASS}>
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
      <Empty className={TABLE_SURFACE_CLASS}>
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
            Add recurring expense
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className={cn(TABLE_SURFACE_CLASS, isFetching && "opacity-60 transition-opacity duration-150")} aria-busy={isFetching}>
      <Table>
        <Columns />
        <TableBody>
          {recurring.map((item) => {
            const isToggling = togglingId === item.id
            return (
              <TableRow
                key={item.id}
                onClick={() => {
                  if (window.getSelection()?.toString()) return
                  onEdit(item)
                }}
                className="cursor-pointer transition-colors duration-150 hover:bg-accent/40"
              >
                <TableCell className="max-w-80 px-4">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn("truncate font-medium", !item.active && "text-muted-foreground")}>
                      {item.category}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.notes || "No notes"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <div>{RECURRENCE_FREQUENCY_LABELS[item.frequency]}</div>
                  <div className="text-xs whitespace-nowrap text-muted-foreground">
                    {item.active ? `Next run ${formatDate(item.nextRunDate)}` : "Paused"}
                  </div>
                </TableCell>
                <TableCell className="px-4 text-right">
                  <div className="font-medium whitespace-nowrap tabular-nums">{formatCurrency(item.amount)}</div>
                  <div className="text-xs text-muted-foreground">{item.paymentMethod}</div>
                </TableCell>
                <TableCell className="px-4">
                  <ScheduleStatusBadge active={item.active} />
                </TableCell>
                <TableCell className="px-4" onClick={stopRowClick}>
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${item.category} schedule`}
                            onClick={() => onEdit(item)}
                          />
                        }
                      >
                        <PencilIcon />
                      </TooltipTrigger>
                      <TooltipContent>Edit schedule</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`More actions for ${item.category} schedule`}
                            className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                          />
                        }
                      >
                        {isToggling ? <Loader2Icon className="animate-spin" /> : <MoreHorizontalIcon />}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem disabled={isToggling} onClick={() => onToggleActive(item)}>
                          {item.active ? <PauseIcon /> : <PlayIcon />}
                          <span className="leading-none">{item.active ? "Pause schedule" : "Resume schedule"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(item)}>
                          <Trash2Icon />
                          <span className="leading-none">Delete schedule</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {footer}
    </div>
  )
}
