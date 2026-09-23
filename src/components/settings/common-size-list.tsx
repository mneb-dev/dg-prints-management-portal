import { useState } from "react"
import { XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { CommonSize } from "@/lib/categories"
import { formatSize } from "@/lib/quick-sizes"
import type { StickerUnit } from "@/lib/sticker-quotation"
import type { LengthUnit } from "@/lib/length-units"

export const MAX_COMMON_SIZES = 8

/** Add/delete-only set of {width, height, unit} presets, shown as removable chips — the same look
 * staff get as quick-size chips on the Calculator. A sibling to `CatalogList`, not a retrofit of it:
 * no rename/enable-toggle/drag-reorder, since ordering isn't admin-meaningful for dimension presets. */
export function CommonSizeList({
  sizes,
  unitOptions,
  isLoading,
  onAdd,
  onDelete,
  defaultUnit,
}: {
  sizes: CommonSize[]
  unitOptions: readonly string[]
  isLoading?: boolean
  onAdd: (size: CommonSize) => Promise<void>
  onDelete: (index: number) => Promise<void>
  defaultUnit: StickerUnit | LengthUnit
}) {
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const isFull = sizes.length >= MAX_COMMON_SIZES

  async function handleDelete(index: number) {
    setDeletingIndex(index)
    try {
      await onDelete(index)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete.")
    } finally {
      setDeletingIndex(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      ) : sizes.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
          No quick sizes yet.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {sizes.map((size, index) => {
            const label = formatSize(size)
            const isDeleting = deletingIndex === index
            return (
              <li
                key={`${label}-${index}`}
                className="flex h-7 animate-in items-center gap-1 rounded-full border bg-background pr-1 pl-2.5 text-xs font-medium tabular-nums duration-200 fade-in-0 zoom-in-95 motion-reduce:animate-none"
              >
                {label}
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  disabled={isDeleting}
                  aria-label={`Remove ${label}`}
                  className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default"
                >
                  {isDeleting ? <Spinner className="size-3" /> : <XIcon className="size-3" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!isLoading && (
        <AddRow unitOptions={unitOptions} disabled={isFull} onAdd={onAdd} defaultUnit={defaultUnit} />
      )}
      {!isLoading && isFull && <p className="-mt-1 text-xs text-muted-foreground">Up to {MAX_COMMON_SIZES} sizes.</p>}
    </div>
  )
}

function AddRow({
  unitOptions,
  disabled,
  onAdd,
  defaultUnit,
}: {
  unitOptions: readonly string[]
  disabled: boolean
  onAdd: (size: CommonSize) => Promise<void>
  defaultUnit: StickerUnit | LengthUnit
}) {
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [unit, setUnit] = useState(defaultUnit)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const widthNum = Number(width)
  const heightNum = Number(height)
  const canSubmit = widthNum > 0 && heightNum > 0 && !!unit

  async function submit() {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      await onAdd({ width: widthNum, height: heightNum, unit })
      setWidth("")
      setHeight("")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to add.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={width}
        onChange={(event) => setWidth(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        placeholder="W"
        aria-label="Width"
        disabled={disabled || isSubmitting}
        className="h-8 w-16 min-w-0 flex-1 tabular-nums sm:flex-none"
      />
      <span aria-hidden className="text-xs text-muted-foreground">
        ×
      </span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={height}
        onChange={(event) => setHeight(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        placeholder="H"
        aria-label="Height"
        disabled={disabled || isSubmitting}
        className="h-8 w-16 min-w-0 flex-1 tabular-nums sm:flex-none"
      />
      <Select value={unit} onValueChange={(value) => setUnit(value ?? defaultUnit)} disabled={disabled || isSubmitting}>
        <SelectTrigger aria-label="Unit" className="h-8 w-18 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {unitOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="shrink-0" onClick={submit} disabled={disabled || isSubmitting || !canSubmit}>
        {isSubmitting && <Spinner data-icon="inline-start" />}
        Add
      </Button>
    </div>
  )
}
