import { useEffect, useState } from "react"
import { GripVerticalIcon, LockIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ColorPicker } from "@/components/categories/color-picker"
import { IconPicker } from "@/components/categories/icon-picker"
import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import { Badge } from "@/components/ui/badge"
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
  // The row currently under the dragged one — gets a primary drop line so it's clear where the
  // status will land.
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<OrderStatusItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDrop(targetId: string) {
    const draggedId = dragId
    setDragId(null)
    setDragOverId(null)
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
      <div className="overflow-x-auto rounded-xl border bg-card">
        {isLoading ? (
          <div className="flex flex-col divide-y">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex min-h-11 items-center gap-2 px-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="size-7 rounded-md" />
                <Skeleton className="size-7 rounded-md" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : statuses.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No statuses yet — add one below.</p>
        ) : (
          statuses.map((item) => (
            <StatusRow
              key={item.id}
              item={item}
              isDragging={dragId === item.id}
              isDropTarget={dragId !== null && dragOverId === item.id && dragId !== item.id}
              isReordering={isReordering}
              onDragStart={() => setDragId(item.id)}
              onDragEnter={() => setDragOverId(item.id)}
              onDragEnd={() => {
                setDragId(null)
                setDragOverId(null)
              }}
              onDrop={() => handleDrop(item.id)}
              onUpdate={(input) => onUpdate(item.id, input)}
              onDeleteRequest={() => setPendingDelete(item)}
            />
          ))
        )}
        <AddRow onAdd={onAdd} />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        tone="danger"
        icon={Trash2Icon}
        title={<>Delete status <Name>{pendingDelete?.label}</Name>?</>}
        description="This can't be undone. If an order is in this status, deleting is blocked — disable it instead."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

function StatusRow({
  item,
  isDragging,
  isDropTarget,
  isReordering,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onUpdate,
  onDeleteRequest,
}: {
  item: OrderStatusItem
  isDragging: boolean
  isDropTarget: boolean
  isReordering: boolean
  onDragStart: () => void
  onDragEnter: () => void
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
      disabled={item.protected}
      onClick={onDeleteRequest}
      className="hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2Icon />
      <span className="sr-only">Delete {item.label}</span>
    </Button>
  )

  return (
    <div
      draggable={!isReordering}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "group/status flex min-h-11 items-center gap-2 border-b px-3 py-1.5 transition-[opacity,box-shadow,background-color] duration-150 last:border-b-0 hover:bg-muted/30",
        isDragging && "opacity-40",
        isDropTarget && "shadow-[inset_0_2px_0_var(--color-primary)]",
        !item.enabled && "bg-muted/20"
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="flex shrink-0 cursor-grab text-muted-foreground/70 transition-colors group-hover/status:text-muted-foreground active:cursor-grabbing" />
          }
        >
          <GripVerticalIcon className="size-4" />
          <span className="sr-only">Drag to reorder</span>
        </TooltipTrigger>
        <TooltipContent>Drag to reorder</TooltipContent>
      </Tooltip>
      <IconPicker value={item.icon} onSelect={handleIconSelect} />
      <ColorPicker value={item.color} onSelect={handleColorSelect} />
      <EditableLabel value={item.label} dimmed={!item.enabled} onCommit={(label) => onUpdate({ label })} />
      {item.protected && (
        <Tooltip>
          <TooltipTrigger render={<Badge variant="secondary" className="shrink-0 gap-1" />}>
            <LockIcon aria-hidden className="size-3!" />
            Built-in
          </TooltipTrigger>
          <TooltipContent>Built-in status — can be renamed, but not deleted.</TooltipContent>
        </Tooltip>
      )}
      <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Switch size="sm" checked={item.enabled} onCheckedChange={(checked) => handleToggle(!!checked)} />
        <span className="w-11">{item.enabled ? "Shown" : "Hidden"}</span>
      </label>
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
  dimmed = false,
  onCommit,
}: {
  value: string
  dimmed?: boolean
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
      aria-label="Status name"
      className={cn(
        "min-w-24 flex-1 truncate rounded-md px-1.5 py-1 text-sm font-medium outline-none transition-colors hover:bg-muted/60 focus:bg-background focus:ring-3 focus:ring-ring/50",
        dimmed && "text-muted-foreground"
      )}
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
    <div className="flex items-center gap-2 border-t border-dashed bg-muted/20 p-2">
      <div className="relative flex-1">
        <PlusIcon aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder="Add a status…"
          aria-label="New status name"
          disabled={isSubmitting}
          className="bg-card pl-8"
        />
      </div>
      <Button size="sm" onClick={submit} disabled={isSubmitting || !value.trim()}>
        {isSubmitting && <Spinner data-icon="inline-start" />}
        {isSubmitting ? "Adding…" : "Add"}
      </Button>
    </div>
  )
}
