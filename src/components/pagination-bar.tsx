import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

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

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-sm text-muted-foreground">
        {total === 0 ? `No ${itemLabel}` : `Showing ${start}–${end} of ${total} ${itemLabel}`}
      </p>
      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => value && onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger size="sm" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon />
          <span className="sr-only">Previous page</span>
        </Button>
        <span className="text-sm tabular-nums">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  )
}
