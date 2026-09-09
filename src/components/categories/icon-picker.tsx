import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getOrderStatusIcon, ORDER_STATUS_ICON_KEYS } from "@/lib/order-status-icons"
import { cn } from "@/lib/utils"

/** Compact icon-swatch button that opens a grid of curated icon choices — same
 * pick-a-key-from-a-fixed-set interaction as AvatarPicker, but as an inline popover
 * (not a full dialog) since it lives on a single row of the order-status list. */
export function IconPicker({
  value,
  onSelect,
  disabled,
}: {
  value: string
  onSelect: (key: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const CurrentIcon = getOrderStatusIcon(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="size-7 shrink-0"
            aria-label="Choose icon"
          />
        }
      >
        <CurrentIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2">
        <div className="grid grid-cols-6 gap-1">
          {ORDER_STATUS_ICON_KEYS.map((key) => {
            const Icon = getOrderStatusIcon(key)
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
                  "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
              >
                <Icon className="size-3.5" />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
