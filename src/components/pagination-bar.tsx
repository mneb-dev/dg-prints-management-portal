import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"

import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getPageItems } from "@/lib/pagination"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

// 44px tap targets on phones, compact enough to sit beside the page track from `sm` up.
const NAV_BUTTON_CLASS = "size-11 sm:size-8"

/** Footer strip for a paged table — rendered inside the table's surface (via its `footer` prop),
 * so it shares the card's border and rounding. */
export function PaginationBar({
  page,
  pageSize,
  total,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  disabled,
}: {
  page: number
  pageSize: number
  total: number
  itemLabel: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const isFirst = page <= 1
  const isLast = page >= pageCount

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-muted/40 px-4 py-2"
    >
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite" aria-atomic="true">
          {total === 0 ? (
            `No ${itemLabel}`
          ) : (
            <>
              <span className="hidden sm:inline">Showing </span>
              <span className="font-medium text-foreground">
                {start}–{end}
              </span>{" "}
              of {total.toLocaleString()}
              <span className="hidden sm:inline"> {itemLabel}</span>
            </>
          )}
        </p>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => value && onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger size="sm" aria-label="Rows per page" className="bg-background">
            <SelectValue>{(value: string) => `${value} / page`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(NAV_BUTTON_CLASS, "hidden sm:inline-flex")}
          disabled={disabled || isFirst}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeftIcon />
          <span className="sr-only">First page</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={NAV_BUTTON_CLASS}
          disabled={disabled || isFirst}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon />
          <span className="sr-only">Previous page</span>
        </Button>

        {/* Phones: just the position. From `sm` up: the numbered track. */}
        <span className="px-1 text-sm tabular-nums sm:hidden">
          Page {page} of {pageCount}
        </span>
        <div className={cn(SEGMENT_TRACK_CLASS, "hidden items-center sm:flex")}>
          {getPageItems(page, pageCount).map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                data-pressed={item === page ? "" : undefined}
                disabled={disabled}
                onClick={() => item !== page && onPageChange(item)}
                className={cn(
                  SEGMENT_CLASS,
                  "inline-flex min-w-7 items-center justify-center px-2 text-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                {item}
              </button>
            ) : (
              <span key={item} aria-hidden className="inline-flex h-7 min-w-5 items-center justify-center text-sm text-muted-foreground">
                …
              </span>
            )
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={NAV_BUTTON_CLASS}
          disabled={disabled || isLast}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon />
          <span className="sr-only">Next page</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(NAV_BUTTON_CLASS, "hidden sm:inline-flex")}
          disabled={disabled || isLast}
          onClick={() => onPageChange(pageCount)}
        >
          <ChevronsRightIcon />
          <span className="sr-only">Last page</span>
        </Button>
      </div>
    </nav>
  )
}
