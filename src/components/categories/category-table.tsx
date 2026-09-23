import { type MouseEvent } from "react"
import { MoreHorizontalIcon, PencilIcon, PlusIcon, TagIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

import { StatusFlowPath } from "@/components/categories/status-flow-path"
import { Badge } from "@/components/ui/badge"
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
import type { Category } from "@/lib/categories"
import { cn } from "@/lib/utils"

/** Same card surface as the Products / Orders tables. */
const SURFACE_CLASS = "overflow-hidden rounded-xl border border-border bg-card"
const HEAD_CLASS = "px-4 text-xs font-medium text-muted-foreground"

function Columns({ canManage }: { canManage?: boolean }) {
  return (
    <TableHeader className="bg-muted/40">
      <TableRow className="hover:bg-transparent">
        <TableHead className={HEAD_CLASS}>Category</TableHead>
        <TableHead className={HEAD_CLASS}>Status</TableHead>
        <TableHead className={HEAD_CLASS}>Order flow</TableHead>
        {canManage && (
          <TableHead className={cn(HEAD_CLASS, "text-right")}>
            <span className="sr-only">Actions</span>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  )
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation()
}

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
      <div className={SURFACE_CLASS}>
        <Table>
          <Columns canManage={canManage} />
          <TableBody>
            {Array.from({ length: 4 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="px-4">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-3 w-32" />
                </TableCell>
                {canManage && (
                  <TableCell className="px-4">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="size-7 rounded-md" />
                      <Skeleton className="size-7 rounded-md" />
                    </div>
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
      <Empty className={SURFACE_CLASS}>
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
      <Empty className={SURFACE_CLASS}>
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
              Add category
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div className={SURFACE_CLASS}>
      <Table>
        <Columns canManage={canManage} />
        <TableBody>
          {categories.map((category) => (
            <TableRow
              key={category.id}
              // Managers open the editor by clicking anywhere on the row (like Products/Orders).
              onClick={canManage ? () => onEdit(category) : undefined}
              className={cn(
                canManage ? "cursor-pointer transition-colors duration-150 hover:bg-accent/40" : "hover:bg-transparent"
              )}
            >
              <TableCell className="px-4">
                <span className={cn("font-medium", !category.active && "text-muted-foreground")}>
                  {category.name}
                </span>
              </TableCell>
              <TableCell className="px-4">
                <Badge variant="secondary" className="gap-1.5">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 translate-y-px rounded-full",
                      category.active ? "bg-order-status-teal" : "bg-muted-foreground/40"
                    )}
                  />
                  <span className="leading-none">{category.active ? "Active" : "Inactive"}</span>
                </Badge>
              </TableCell>
              <TableCell className="px-4" onClick={stopRowClick}>
                <StatusFlowPath statuses={category.statusFlow} />
              </TableCell>
              {canManage && (
                <TableCell className="px-4" onClick={stopRowClick}>
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${category.name}`}
                            onClick={() => onEdit(category)}
                          />
                        }
                      >
                        <PencilIcon />
                      </TooltipTrigger>
                      <TooltipContent>Edit category</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`More actions for ${category.name}`}
                            className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                          />
                        }
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem onClick={() => onEdit(category)}>
                          <PencilIcon />
                          <span className="leading-none">Edit category</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(category)}>
                          <Trash2Icon />
                          <span className="leading-none">Delete category</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
