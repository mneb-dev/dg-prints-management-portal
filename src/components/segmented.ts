import { cn } from "@/lib/utils"

/** Joined segmented track (a `ToggleGroup` of `Toggle`s) — used wherever a user picks one of a
 * few values with one click: product status filter and form, order payment status, etc. The
 * selected segment takes the soft indigo accent, a hairline ring and a lift, rather than a solid
 * fill, so any colored dot inside it stays visible. */
export const SEGMENT_TRACK_CLASS = "no-scrollbar max-w-full flex-nowrap gap-0.5 overflow-x-auto rounded-lg border border-input bg-muted/60 p-0.5"

export const SEGMENT_CLASS = cn(
  "h-7 shrink-0 gap-2 rounded-md border-0 px-3 pointer-coarse:h-9 text-muted-foreground transition-[background-color,color,box-shadow] duration-200 hover:bg-background/60 hover:text-foreground",
  "data-[pressed]:bg-accent data-[pressed]:font-semibold data-[pressed]:text-accent-foreground data-[pressed]:shadow-sm data-[pressed]:ring-1 data-[pressed]:ring-primary/40 data-[pressed]:hover:bg-accent",
  "dark:bg-transparent dark:data-[pressed]:bg-accent"
)
