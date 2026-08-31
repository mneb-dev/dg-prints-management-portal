import type { ReactNode } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Shared visual container for a list page's filter row. */
export function FilterToolbar({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-lg border bg-card/40 p-3", className)}>
      {children}
    </div>
  )
}

/** Shared search input with a leading icon, used identically across list pages. */
export function FilterSearchInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn("relative flex-1 min-w-48", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
        disabled={disabled}
      />
    </div>
  )
}

export type ActiveFilter = {
  key: string
  label: string
  onRemove: () => void
}

/** Removable chips for currently-applied filters, plus an optional "Clear all". */
export function ActiveFilterChips({
  filters,
  onClearAll,
  disabled,
}: {
  filters: ActiveFilter[]
  onClearAll?: () => void
  disabled?: boolean
}) {
  if (filters.length === 0) return null

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <Badge key={filter.key} variant="secondary" className="gap-1 pr-1">
          {filter.label}
          <button
            type="button"
            onClick={filter.onRemove}
            disabled={disabled}
            className="rounded-full p-0.5 hover:bg-foreground/10 disabled:pointer-events-none disabled:opacity-50"
          >
            <XIcon className="size-3" />
            <span className="sr-only">Remove filter: {filter.label}</span>
          </button>
        </Badge>
      ))}
      {onClearAll && (
        <Button variant="ghost" size="sm" onClick={onClearAll} disabled={disabled}>
          <XIcon data-icon="inline-start" />
          Clear all
        </Button>
      )}
    </div>
  )
}
