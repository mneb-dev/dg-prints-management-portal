import { useState } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
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

const MAX_SIZES = 8

/** Add/delete-only list of {width, height, unit} presets — a sibling to
 * `CatalogList` (settings/catalog-list.tsx), not a retrofit of it: the shape and
 * interactions differ enough (numeric width/height + a unit select instead of a single
 * name field; no rename/enable-toggle/drag-reorder, since ordering isn't admin-meaningful
 * for dimension presets) to warrant its own component, though it reuses the same
 * skeleton/toast conventions. */
export function CommonSizeList({
  sizes,
  unitOptions,
  isLoading,
  onAdd,
  onDelete,
  defaultUnit
}: {
  sizes: CommonSize[]
  unitOptions: readonly string[]
  isLoading?: boolean
  onAdd: (size: CommonSize) => Promise<void>
  onDelete: (index: number) => Promise<void>
  defaultUnit: StickerUnit | LengthUnit
}) {
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)

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
    <div className="w-full">
      <div className="rounded-lg border">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2.5">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : sizes.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">Nothing yet.</p>
        ) : (
          sizes.map((size, index) => (
            <div
              key={`${formatSize(size)}-${index}`}
              className="flex items-center gap-1.5 border-b px-2 py-1 last:border-b-0"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{formatSize(size)}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={() => handleDelete(index)}
                disabled={deletingIndex === index}
              >
                {deletingIndex === index ? <Spinner className="size-3.5" /> : <Trash2Icon className="size-3.5" />}
                <span className="sr-only">Delete {formatSize(size)}</span>
              </Button>
            </div>
          ))
        )}
        {!isLoading && (
          <AddRow unitOptions={unitOptions} disabled={sizes.length >= MAX_SIZES} onAdd={onAdd} defaultUnit={defaultUnit}/>
        )}
      </div>
      {!isLoading && sizes.length >= MAX_SIZES && (
        <p className="mt-1 text-xs text-muted-foreground">Up to {MAX_SIZES} sizes.</p>
      )}
    </div>
  )
}

function AddRow({
  unitOptions,
  disabled,
  onAdd,
  defaultUnit
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
    <div className="flex items-center gap-1.5 border-t p-1.5">
      <Input
        type="number"
        min={0}
        step="0.01"
        value={width}
        onChange={(event) => setWidth(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        placeholder="Width"
        disabled={disabled || isSubmitting}
        className="h-7 w-16 text-sm"
      />
      <span className="text-xs text-muted-foreground">×</span>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={height}
        onChange={(event) => setHeight(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        placeholder="Height"
        disabled={disabled || isSubmitting}
        className="h-7 w-16 text-sm"
      />
      <Select value={unit} onValueChange={(value) => setUnit(value ?? defaultUnit)} disabled={disabled || isSubmitting}>
        <SelectTrigger className="h-7 w-16 text-sm">
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
      <Button
        size="icon-sm"
        className="size-7 shrink-0"
        onClick={submit}
        disabled={disabled || isSubmitting || !canSubmit}
      >
        {isSubmitting ? <Spinner className="size-3.5" /> : <PlusIcon className="size-3.5" />}
      </Button>
    </div>
  )
}
