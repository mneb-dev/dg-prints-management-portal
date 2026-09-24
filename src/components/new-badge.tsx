import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NEW_PRODUCT_DAYS } from "@/lib/new-products"
import { cn } from "@/lib/utils"

/** "New" pill for products added in the last NEW_PRODUCT_DAYS days (see new-products.ts). Same
 * treatment as the Products count in the sidebar (primary tint, pill, semibold), so the badge
 * there and the rows it counts read as one signal. */
export function NewBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center rounded-full bg-primary/10 px-1.5 text-xs leading-none font-semibold text-primary",
              className
            )}
          />
        }
      >
        New
      </TooltipTrigger>
      <TooltipContent>
        Added in the last {NEW_PRODUCT_DAYS} days
      </TooltipContent>
    </Tooltip>
  )
}
