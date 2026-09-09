import { useEffect, useState } from "react"
import { GripVerticalIcon, LockIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ColorPicker } from "@/components/categories/color-picker"
import { IconPicker } from "@/components/categories/icon-picker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { OrderStatusItem } from "@/lib/order-statuses"
import { cn } from "@/lib/utils"

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Drag-reorderable order-status list — the "Order Statuses" tab of Manage Categories.
 * Adapted from the Settings page's CatalogList (same native-HTML5-drag pattern, no DnD
 * library), but diverges where order statuses differ from payment methods/order channels:
 * a status can't be deleted while an order references it (CatalogList's items can), the
 * 5 built-in statuses can't be deleted at all, and each row carries an icon picker. The
 * internal `name` (the literal stored on orders) is set once at creation from the typed
 * label and never re-editable through this list — only `label`, `icon`, and `enabled`
 * are, for every status including protected ones (the backend only locks `name` changes
 * on a protected row, not its label/icon/enabled). */
export function OrderStatusList({
  statuses,
  isLoading,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: {
  statuses: OrderStatusItem[]
  isLoading?: boolean
  onAdd: (input: { name: string; label: string; icon: string }) => Promise<void>
  onUpdate: (
    id: string,
    input: { label?: string; icon?: string; color?: string; enabled?: boolean }
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (order: string[]) => Promise<void>
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<OrderStatusItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDrop(targetId: string) {
    const draggedId = dragId
    setDragId(null)
    if (!draggedId || draggedId === targetId) return

    const ids = statuses.map((item) => item.id)
    const fromIndex = ids.indexOf(draggedId)
    const toIndex = ids.indexOf(targetId)
    ids.splice(toIndex, 0, ids.splice(fromIndex, 1)[0])

    setIsReordering(true)
    try {
      await onReorder(ids)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to reorder.")
    } finally {
      setIsReordering(false)
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await onDelete(pendingDelete.id)
      toast.success("Status deleted.")
      setPendingDelete(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete status.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-lg border">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2.5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : statuses.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">Nothing yet.</p>
        ) : (
          statuses.map((item) => (
            <StatusRow
              key={item.id}
              item={item}
              isDragging={dragId === item.id}
              isReordering={isReordering}
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => setDragId(null)}
              onDrop={() => handleDrop(item.id)}
              onUpdate={(input) => onUpdate(item.id, input)}
              onDeleteRequest={() => setPendingDelete(item)}
            />
          ))
        )}
        <AddRow onAdd={onAdd} />
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. If any order currently has this status, deletion will be
              blocked — disable it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting && <Spinner data-icon="inline-start" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusRow({
  item,
  isDragging,
  isReordering,
  onDragStart,
  onDragEnd,
  onDrop,
  onUpdate,
  onDeleteRequest,
}: {
  item: OrderStatusItem
  isDragging: boolean
  isReordering: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
  onUpdate: (input: { label?: string; icon?: string; color?: string; enabled?: boolean }) => Promise<void>
  onDeleteRequest: () => void
}) {
  async function handleIconSelect(icon: string) {
    try {
      await onUpdate({ icon })
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update icon.")
    }
  }

  async function handleColorSelect(color: string) {
    try {
      await onUpdate({ color })
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update color.")
    }
  }

  async function handleToggle(enabled: boolean) {
    try {
      await onUpdate({ enabled })
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update status.")
    }
  }

  const deleteButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      className="size-6"
      disabled={item.protected}
      onClick={onDeleteRequest}
    >
      <Trash2Icon className="size-3.5" />
      <span className="sr-only">Delete {item.label}</span>
    </Button>
  )

  return (
    <div
      draggable={!isReordering}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-1.5 border-b px-2 py-1.5 last:border-b-0",
        isDragging && "opacity-40"
      )}
    >
      <GripVerticalIcon className="size-3.5 shrink-0 cursor-grab text-muted-foreground" />
      <IconPicker value={item.icon} onSelect={handleIconSelect} />
      <ColorPicker value={item.color} onSelect={handleColorSelect} />
      <EditableLabel value={item.label} onCommit={(label) => onUpdate({ label })} />
      {item.protected && (
        <Tooltip>
          <TooltipTrigger render={<LockIcon className="size-3 shrink-0 text-muted-foreground" />} />
          <TooltipContent>Built-in status — can't be renamed or deleted.</TooltipContent>
        </Tooltip>
      )}
      <Switch size="sm" checked={item.enabled} onCheckedChange={(checked) => handleToggle(!!checked)} />
      {item.protected ? (
        <Tooltip>
          <TooltipTrigger render={deleteButton} />
          <TooltipContent>Built-in status — can't be deleted.</TooltipContent>
        </Tooltip>
      ) : (
        deleteButton
      )}
    </div>
  )
}

function EditableLabel({
  value,
  onCommit,
}: {
  value: string
  onCommit: (label: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  async function commit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) {
      setDraft(value)
      return
    }
    try {
      await onCommit(trimmed)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to rename.")
      setDraft(value)
    }
  }

  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur()
        if (event.key === "Escape") setDraft(value)
      }}
      className="min-w-24 flex-1 truncate rounded px-1 py-0.5 text-sm outline-none hover:bg-muted/50 focus:bg-muted focus:ring-1 focus:ring-ring"
    />
  )
}

function AddRow({
  onAdd,
}: {
  onAdd: (input: { name: string; label: string; icon: string }) => Promise<void>
}) {
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit() {
    const label = value.trim()
    if (!label) return
    const name = slugify(label)
    if (!name) {
      toast.error("Enter a valid status name.")
      return
    }
    setIsSubmitting(true)
    try {
      await onAdd({ name, label, icon: "circle" })
      setValue("")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to add status.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 border-t p-1.5">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        placeholder="Add new status..."
        disabled={isSubmitting}
        className="h-7 flex-1 text-sm"
      />
      <Button
        size="icon-sm"
        className="size-7 shrink-0"
        onClick={submit}
        disabled={isSubmitting || !value.trim()}
      >
        {isSubmitting ? <Spinner className="size-3.5" /> : <PlusIcon className="size-3.5" />}
      </Button>
    </div>
  )
}
