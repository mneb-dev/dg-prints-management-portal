import type { CommonSize } from "@/lib/categories"
import { formatSize } from "@/lib/quick-sizes"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

/** One merged, undifferentiated row of quick-select size chips — admin-configured common
 * sizes and computed hot sizes are already merged/deduped by the caller (calculator-page.tsx)
 * before reaching here, so this component never distinguishes "common" from "hot". Clicking
 * a chip is a one-shot prefill action, not a persistent choice, so chips carry no selected
 * state. Kept external to StickerQuotationFields/LaminatedStickerQuotationFields — those are
 * shared with the real Order Form and must not change shape for this feature. */
export function QuickSizeChips({
  sizes,
  onSelect,
  isLoading,
}: {
  sizes: CommonSize[]
  onSelect: (size: CommonSize) => void
  isLoading?: boolean
}) {
  if (!isLoading && sizes.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Quick sizes</span>
      <div className="flex flex-wrap gap-1.5">
        {isLoading
          ? [0, 1, 2].map((index) => <Skeleton key={index} className="h-7 w-16 rounded-full" />)
          : sizes.map((size, index) => (
              <button
                key={`${formatSize(size)}-${index}`}
                type="button"
                onClick={() => onSelect(size)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap text-foreground outline-none transition-colors",
                  "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
              >
                {formatSize(size)}
              </button>
            ))}
      </div>
    </div>
  )
}
