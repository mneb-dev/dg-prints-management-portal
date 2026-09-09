import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getOrderStatusColors, ORDER_STATUS_COLOR_KEYS } from "@/lib/order-status-colors"
import { cn } from "@/lib/utils"

/** Compact color-swatch button that opens a grid of curated color choices — same
 * pick-a-key-from-a-fixed-set interaction as IconPicker, as an inline popover on a single
 * row of the order-status list. */
export function ColorPicker({
  value,
  onSelect,
  disabled,
}: {
  value: string
  onSelect: (key: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="size-7 shrink-0"
            aria-label="Choose color"
          />
        }
      >
        <span className={cn("size-3.5 rounded-full", getOrderStatusColors(value).solid)} />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2">
        <div className="grid grid-cols-6 gap-1">
          {ORDER_STATUS_COLOR_KEYS.map((key) => {
            const isSelected = key === value
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelect(key)
                  setOpen(false)
                }}
                aria-label={key}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
                  isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-popover"
                )}
              >
                <span className={cn("size-4 rounded-full", getOrderStatusColors(key).solid)} />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
