import { PencilIcon, PlusIcon, TagIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Category } from "@/lib/categories"

import {
  ORDER_STATUS_ICONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
} from "@/components/orders/order-status-badge"

export function CategoryTable({
  categories,
  isLoading,
  isError,
  error,
  canManage,
  onCreate,
  onEdit,
  onDelete,
}: {
  categories: Category[]
  isLoading?: boolean
  isError?: boolean
  error?: string | null
  canManage?: boolean
  onCreate?: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order statuses</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
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
          <EmptyTitle>Couldn't load categories</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (categories.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TagIcon />
          </EmptyMedia>
          <EmptyTitle>No categories yet</EmptyTitle>
          <EmptyDescription>Get started by adding your first category.</EmptyDescription>
        </EmptyHeader>
        {canManage && (
          <EmptyContent>
            <Button size="sm" onClick={onCreate}>
              <PlusIcon data-icon="inline-start" />
              Add Category
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Order statuses</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => {
            const statusFlowSummary = category.statusFlow
              .map((status) => ORDER_STATUS_LABELS[status])
              .join(" → ")
            return (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  <Badge variant={category.active ? "success" : "secondary"}>
                    {category.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <div
                          className="flex w-fit items-center gap-1"
                          aria-label={statusFlowSummary}
                        />
                      }
                    >
                      {category.statusFlow.map((status) => {
                        const Icon = ORDER_STATUS_ICONS[status]
                        return (
                          <Badge
                            key={status}
                            variant={ORDER_STATUS_VARIANTS[status]}
                            className="size-5 justify-center rounded-full p-0"
                            aria-hidden
                          >
                            <Icon className="size-3" />
                          </Badge>
                        )
                      })}
                    </TooltipTrigger>
                    <TooltipContent>{statusFlowSummary}</TooltipContent>
                  </Tooltip>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => onEdit(category)}>
                        <PencilIcon />
                        <span className="sr-only">Edit {category.name}</span>
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => onDelete(category)}>
                        <Trash2Icon />
                        <span className="sr-only">Delete {category.name}</span>
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
