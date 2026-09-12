import { ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type SortDirection = "asc" | "desc"

export function SortControl({
  value,
  direction,
  options,
  onChange,
  disabled,
  className,
}: {
  value: string
  direction: SortDirection
  options: { value: string; label: string }[]
  onChange: (value: string, direction: SortDirection) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn("inline-flex items-center", className)}>
      <Select
        value={value}
        onValueChange={(next) => next && onChange(next, direction)}
        disabled={disabled}
        items={options}
      >
        <SelectTrigger className="min-w-0 flex-1 rounded-r-none border-r-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-l-none"
        disabled={disabled}
        onClick={() => onChange(value, direction === "asc" ? "desc" : "asc")}
      >
        {direction === "asc" ? <ArrowUpNarrowWideIcon /> : <ArrowDownWideNarrowIcon />}
        <span className="sr-only">
          Sort {direction === "asc" ? "ascending" : "descending"} (click to reverse)
        </span>
      </Button>
    </div>
  )
}
