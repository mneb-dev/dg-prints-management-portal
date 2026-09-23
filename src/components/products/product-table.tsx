import { type MouseEvent } from "react"
import {
  Loader2Icon,
  MoreHorizontalIcon,
  PackageSearchIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { cn, formatCurrency } from "@/lib/utils"
import { summarizePricing, type Product } from "@/lib/products"
import type { Role } from "@/lib/users-slice"

/** Same card-like surface as the Orders table (rounded-xl, bg-card, soft shadow). */
const SURFACE_CLASS = "overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]"
const HEAD_CLASS = "px-4 text-xs font-medium text-muted-foreground"

/** Neutral chip + dot, like every other status chip in the app (docs/design-system.md). */
function ProductStatusBadge({ status }: { status: Product["status"] }) {
  const isActive = status === "Active"
  return (
    <Badge variant="secondary" className="gap-1.5">
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 translate-y-px rounded-full",
          isActive ? "bg-order-status-teal" : "bg-muted-foreground/40"
        )}
      />
      <span className="leading-none">{status}</span>
    </Badge>
  )
}

/** "₱120 – ₱850" across a product's configured prices, or a single price. */
function priceRange(product: Product): string | null {
  const prices = product.pricing.map((entry) => entry.price).filter((price) => Number.isFinite(price) && price > 0)
  if (prices.length === 0) return null
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation()
}

function Columns({ showActions }: { showActions: boolean }) {
  return (
    <TableHeader className="bg-muted/40">
      <TableRow className="hover:bg-transparent">
        <TableHead className={HEAD_CLASS}>Product</TableHead>
        <TableHead className={HEAD_CLASS}>Pricing</TableHead>
        <TableHead className={HEAD_CLASS}>Status</TableHead>
        {showActions && (
          <TableHead className={cn(HEAD_CLASS, "text-right")}>
            <span className="sr-only">Actions</span>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  )
}

export function ProductTable({
  products,
  isLoading,
  isFetching,
  isError,
  error,
  hasActiveFilters,
  searchTerm,
  canManage,
  role,
  onClearFilters,
  onCreate,
  onEdit,
  onView,
  onDelete,
}: {
  products: Product[]
  isLoading?: boolean
  isFetching?: boolean
  isError?: boolean
  error?: string | null
  hasActiveFilters?: boolean
  searchTerm?: string
  canManage?: boolean
  role?: Role | null
  onClearFilters?: () => void
  onCreate?: () => void
  onEdit: (product: Product) => void
  /** Read-only details, for people who can't edit (staff). */
  onView?: (product: Product) => void
  onDelete: (product: Product) => void
}) {
  const showActions = role !== "staff" && !!canManage

  if (isLoading) {
    return (
      <div className={SURFACE_CLASS}>
        <Table>
          <Columns showActions={showActions} />
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="px-4">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-1.5 h-3 w-20" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                {showActions && (
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
          <EmptyTitle>Couldn't load products</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (products.length === 0) {
    if (hasActiveFilters) {
      return (
        <Empty className={SURFACE_CLASS}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageSearchIcon />
            </EmptyMedia>
            <EmptyTitle>No products match your {searchTerm ? "search" : "filters"}</EmptyTitle>
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
      <Empty className={SURFACE_CLASS}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearchIcon />
          </EmptyMedia>
          <EmptyTitle>No products yet</EmptyTitle>
          <EmptyDescription>Get started by adding your first product.</EmptyDescription>
        </EmptyHeader>
        {canManage && (
          <EmptyContent>
            <Button size="sm" onClick={onCreate}>
              <PlusIcon data-icon="inline-start" />
              Add product
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div className="relative" aria-busy={isFetching}>
      <div className={cn(SURFACE_CLASS, isFetching && "opacity-60 transition-opacity duration-150")}>
        <Table>
          <Columns showActions={showActions} />
          <TableBody>
            {products.map((product) => {
              const isInactive = product.status !== "Active"
              const optionCount = product.options.length
              const range = priceRange(product)
              return (
                <TableRow
                  key={product.id}
                  // Clicking a row opens the product: the editor for managers, read-only details
                  // for everyone else (staff) — same row-click pattern as Orders.
                  onClick={() => {
                    if (window.getSelection()?.toString()) return
                    if (showActions) onEdit(product)
                    else onView?.(product)
                  }}
                  className="cursor-pointer transition-colors duration-150 hover:bg-accent/40"
                >
                  <TableCell className="px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className={cn("truncate font-medium", isInactive && "text-muted-foreground")}>
                          {product.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {product.category}
                          {optionCount > 0 && ` · ${optionCount} ${optionCount === 1 ? "option" : "options"}`}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="tabular-nums">{range ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {summarizePricing(product.pricing)}
                      {product.pricing.length > 0 &&
                        ` · ${product.pricing.length} ${product.pricing.length === 1 ? "price" : "prices"}`}
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <ProductStatusBadge status={product.status} />
                  </TableCell>
                  {showActions && (
                    <TableCell className="px-4" onClick={stopRowClick}>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${product.name}`}
                                onClick={() => onEdit(product)}
                              />
                            }
                          >
                            <PencilIcon />
                          </TooltipTrigger>
                          <TooltipContent>Edit product</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`More actions for ${product.name}`}
                                className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                              />
                            }
                          >
                            <MoreHorizontalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem variant="destructive" onClick={() => onDelete(product)}>
                              <Trash2Icon />
                              <span className="leading-none">Delete product</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
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
