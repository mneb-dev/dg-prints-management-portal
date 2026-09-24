import type { ReactNode } from "react"
import { SlidersHorizontalIcon, XIcon } from "lucide-react"

import { ACTIVE_FILTER_TRIGGER_CLASS } from "@/components/filter-toolbar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

/** A list page's secondary filters (status, owner, date, sort…). From `md` up they render inline
 * in the `FilterToolbar`, as before; on phones they collapse into one "Filters" button that opens a
 * bottom sheet, so the search box and the results stay on the first screen. Filters still apply as
 * they change — the sheet's button just closes it. Rendered in one place only (not both, hidden
 * with CSS), so ids and open popovers aren't duplicated. */
export function ResponsiveFilters({
  activeCount,
  onClearAll,
  disabled,
  children,
}: {
  /** Filters in this group with a non-default value; badges the phone trigger. */
  activeCount: number
  onClearAll?: () => void
  disabled?: boolean
  children: ReactNode
}) {
  const isMobile = useIsMobile()

  if (!isMobile) return <>{children}</>

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className={cn("shrink-0 gap-2", activeCount > 0 && ACTIVE_FILTER_TRIGGER_CLASS)}
          />
        }
      >
        <SlidersHorizontalIcon data-icon="inline-start" />
        Filters
        {activeCount > 0 ? (
          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        {/* Each control takes the full width here; inline they keep their own toolbar widths. */}
        <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain p-4 *:w-full [&_[data-slot=select-trigger]]:w-full">
          {children}
        </div>
        <SheetFooter className="flex-row border-t">
          {onClearAll ? (
            <Button variant="outline" className="flex-1" onClick={onClearAll} disabled={disabled || activeCount === 0}>
              <XIcon data-icon="inline-start" />
              Clear all
            </Button>
          ) : null}
          <SheetClose render={<Button className="flex-1" />}>Show results</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
