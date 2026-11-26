import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SPX_ITEM_TYPES, type SpxItemType } from "@/lib/spx-item-types"
import { cn } from "@/lib/utils"

/** SPX's "Item Type" drop-down values (from its mass order template). */
export function SpxItemTypeSelect({
  value,
  onChange,
  disabled,
  size,
  className,
  "aria-label": ariaLabel = "Item type",
}: {
  value: SpxItemType
  onChange: (value: SpxItemType) => void
  disabled?: boolean
  size?: "sm" | "default"
  className?: string
  "aria-label"?: string
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next as SpxItemType)} disabled={disabled}>
      <SelectTrigger size={size} aria-label={ariaLabel} className={cn("w-full min-w-0", className)}>
        <SelectValue>{(current: string | null) => current ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SPX_ITEM_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
