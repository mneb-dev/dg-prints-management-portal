"use client"

import { format, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { ACTIVE_FILTER_TRIGGER_CLASS } from "@/components/filter-toolbar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function formatDateRangeLabel(range: DateRange | undefined, placeholder: string) {
  if (!range?.from) return placeholder
  if (!range.to) return `${format(range.from, "MMM d, yyyy")} – …`
  return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
}

/** Shared FROM/TO range picker: one trigger button + one range-mode Calendar, matching the
 *  Order Table page's filter. Reused instead of pairing two single-date pickers per module. */
export function DateRangeFilter({
  id,
  from,
  to,
  onChange,
  disabled,
  maxDate = new Date(),
  placeholder = "Select date range",
  className,
  ariaLabel,
  title,
}: {
  id?: string
  /** ISO "yyyy-MM-dd", or "" when unset. */
  from: string
  /** ISO "yyyy-MM-dd", or "" when unset. */
  to: string
  onChange: (from: string, to: string) => void
  disabled?: boolean
  maxDate?: Date
  placeholder?: string
  className?: string
  ariaLabel?: string
  title?: string
}) {
  const dateRange: DateRange | undefined =
    from || to
      ? {
          from: from ? parseISO(from) : undefined,
          to: to ? parseISO(to) : undefined,
        }
      : undefined

  function handleSelect(range: DateRange | undefined) {
    onChange(range?.from ? format(range.from, "yyyy-MM-dd") : "", range?.to ? format(range.to, "yyyy-MM-dd") : "")
  }

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        title={title}
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 justify-start font-normal sm:min-w-56", dateRange && ACTIVE_FILTER_TRIGGER_CLASS, className)}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {formatDateRangeLabel(dateRange, placeholder)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          disabled={{ after: maxDate }}
          resetOnSelect
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
