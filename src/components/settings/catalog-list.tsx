import { useEffect, useState } from "react"
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

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
import { cn } from "@/lib/utils"

export type CatalogListItem = {
  id: string
  name: string
  enabled: boolean
}

/** Compact, drag-reorderable CRUD list — shared by Payment Methods and Order Channels
 * on the Settings page, since both are the exact same shape (name, enabled, order). */
export function CatalogList({
  items,
  isLoading,
  onAdd,
  onRename,
  onToggle,
  onDelete,
  onReorder,
}: {
  items: CatalogListItem[]
  isLoading?: boolean
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onToggle: (id: string, enabled: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (order: string[]) => Promise<void>
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CatalogListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDrop(targetId: string) {
    const draggedId = dragId
    setDragId(null)
    if (!draggedId || draggedId === targetId) return

    const ids = items.map((item) => item.id)
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
      setPendingDelete(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-lg border">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2.5">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">Nothing yet.</p>
        ) : (
          items.map((item) => (
            <CatalogRow
              key={item.id}
              item={item}
              isDragging={dragId === item.id}
              isReordering={isReordering}
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => setDragId(null)}
              onDrop={() => handleDrop(item.id)}
              onRename={(name) => onRename(item.id, name)}
              onToggle={(enabled) => onToggle(item.id, enabled)}
              onDeleteRequest={() => setPendingDelete(item)}
            />
          ))
        )}
        <AddRow onAdd={onAdd} />
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This won't affect orders that already used it — they'll keep showing it as recorded.
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

function CatalogRow({
  item,
  isDragging,
  isReordering,
  onDragStart,
  onDragEnd,
  onDrop,
  onRename,
  onToggle,
  onDeleteRequest,
}: {
  item: CatalogListItem
  isDragging: boolean
  isReordering: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
  onRename: (name: string) => Promise<void>
  onToggle: (enabled: boolean) => Promise<void>
  onDeleteRequest: () => void
}) {
  return (
    <div
      draggable={!isReordering}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-1.5 border-b px-2 py-1 last:border-b-0",
        isDragging && "opacity-40"
      )}
    >
      <GripVerticalIcon className="size-3.5 shrink-0 cursor-grab text-muted-foreground" />
      <EditableName value={item.name} onCommit={onRename} />
      <Switch
        size="sm"
        checked={item.enabled}
        onCheckedChange={(checked) => onToggle(!!checked)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-6"
        onClick={onDeleteRequest}
      >
        <Trash2Icon className="size-3.5" />
        <span className="sr-only">Delete {item.name}</span>
      </Button>
    </div>
  )
}

function EditableName({ value, onCommit }: { value: string; onCommit: (name: string) => Promise<void> }) {
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
      className="min-w-0 flex-1 truncate rounded px-1 py-0.5 text-sm outline-none hover:bg-muted/50 focus:bg-muted focus:ring-1 focus:ring-ring"
    />
  )
}

function AddRow({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    setIsSubmitting(true)
    try {
      await onAdd(trimmed)
      setValue("")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to add.")
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
        placeholder="Add new..."
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
