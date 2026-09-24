import type { ComponentProps, KeyboardEvent, MouseEvent, ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Phone view of a data table: the same rows as stacked cards, one per `DataCardItem`. It sits
 * inside the table's own surface (next to a `hidden md:block` table), so the surface, pager and
 * empty/error states stay shared between both views. Shown below `md` only. */
export function DataCardList({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="data-card-list" className={cn("divide-y divide-border md:hidden", className)} {...props} />
}

/** One row as a card. With `onOpen` the whole card opens the record, like a clickable table row;
 * controls inside it stop the click (see each table's `stopRowClick`). */
export function DataCardItem({
  className,
  onOpen,
  ...props
}: ComponentProps<"li"> & { onOpen?: () => void }) {
  function handleClick(event: MouseEvent<HTMLLIElement>) {
    props.onClick?.(event)
    // Selecting text on a card (e.g. copying an order number) shouldn't open it.
    if (!onOpen || window.getSelection()?.toString()) return
    onOpen()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    props.onKeyDown?.(event)
    if (onOpen && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <li
      data-slot="data-card-item"
      className={cn(
        "flex flex-col gap-2.5 px-4 py-3.5 text-sm",
        onOpen &&
          "cursor-pointer transition-colors duration-150 outline-none active:bg-accent/40 focus-visible:bg-accent/40",
        className
      )}
      {...props}
      tabIndex={onOpen ? 0 : props.tabIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  )
}

/** Label / value pair for the secondary fields of a card. */
export function DataCardField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  )
}

export function DataCardListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <DataCardList aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <DataCardItem key={index}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </DataCardItem>
      ))}
    </DataCardList>
  )
}
