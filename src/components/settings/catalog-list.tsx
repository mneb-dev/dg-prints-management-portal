import { useEffect, useState } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import { SortableList, type SortableRowProps } from "@/components/sortable-list"
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

/** Compact, drag-reorderable CRUD list — shared by Payment methods and Order channels on the
 * Settings page, since both are the exact same shape (name, enabled, order). Rows follow the Order
 * statuses list (categories/order-status-list.tsx): a grip that drags the row (SortableList), a
 * Shown/Hidden switch, and dimmed hidden rows. */
export function CatalogList({
  items,
  isLoading,
  noun = "items",
  addPlaceholder = "Add new…",
  onAdd,
  onRename,
  onToggle,
  onDelete,
  onReorder,
}: {
  items: CatalogListItem[]
  isLoading?: boolean
  /** Plural noun for copy, e.g. "payment methods". */
  noun?: string
  addPlaceholder?: string
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onToggle: (id: string, enabled: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (order: string[]) => Promise<void>
}) {
  const [pendingDelete, setPendingDelete] = useState<CatalogListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const shownCount = items.filter((item) => item.enabled).length

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
      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {isLoading ? "Loading…" : `${shownCount} of ${items.length} shown`}
          </span>
          {items.length > 1 ? <span className="hidden sm:inline">Drag to reorder</span> : null}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No {noun} yet. Add the first one below.
          </p>
        ) : (
          <SortableList
            items={items}
            getLabel={(item) => item.name}
            onReorder={onReorder}
            renderItem={(item, sortable) => (
              <CatalogRow
                item={item}
                sortable={sortable}
                onRename={(name) => onRename(item.id, name)}
                onToggle={(enabled) => onToggle(item.id, enabled)}
                onDeleteRequest={() => setPendingDelete(item)}
              />
            )}
          />
        )}
        <AddRow placeholder={addPlaceholder} onAdd={onAdd} />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        tone="danger"
        icon={Trash2Icon}
        title={<>Delete <Name>{pendingDelete?.name}</Name>?</>}
        description="Orders that already used it keep showing it as recorded."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

function CatalogRow({
  item,
  sortable: { attachRow, rowStyle, dragHandle, isDragging },
  onRename,
  onToggle,
  onDeleteRequest,
}: {
  item: CatalogListItem
  sortable: SortableRowProps
  onRename: (name: string) => Promise<void>
  onToggle: (enabled: boolean) => Promise<void>
  onDeleteRequest: () => void
}) {
  return (
    <div
      ref={attachRow}
      style={rowStyle}
      className={cn(
        "group/row flex min-h-11 items-center gap-2 border-b bg-card px-3 py-1.5 transition-[background-color,box-shadow] duration-150 hover:bg-muted/30",
        isDragging && "bg-card shadow-lg ring-1 ring-primary/30 hover:bg-card",
        !item.enabled && !isDragging && "bg-muted/20"
      )}
    >
      {dragHandle}
      <EditableName value={item.name} dimmed={!item.enabled} onCommit={onRename} />
      <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Switch size="sm" checked={item.enabled} onCheckedChange={(checked) => onToggle(!!checked)} />
        <span className="w-11">{item.enabled ? "Shown" : "Hidden"}</span>
      </label>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDeleteRequest}
        className="hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2Icon />
        <span className="sr-only">Delete {item.name}</span>
      </Button>
    </div>
  )
}

function EditableName({
  value,
  dimmed = false,
  onCommit,
}: {
  value: string
  dimmed?: boolean
  onCommit: (name: string) => Promise<void>
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
      aria-label="Name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur()
        if (event.key === "Escape") setDraft(value)
      }}
      className={cn(
        "min-w-0 flex-1 truncate rounded-md px-1.5 py-1 text-sm font-medium outline-none transition-colors hover:bg-muted/60 focus:bg-muted focus:ring-2 focus:ring-ring/40",
        dimmed && "text-muted-foreground"
      )}
    />
  )
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => Promise<void> }) {
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
    <div className="flex items-center gap-2 border-t bg-muted/20 p-2">
      <div className="relative min-w-0 flex-1">
        <PlusIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={isSubmitting}
          className="h-8 bg-background pl-8"
        />
      </div>
      <Button size="sm" className="shrink-0" onClick={submit} disabled={isSubmitting || !value.trim()}>
        {isSubmitting && <Spinner data-icon="inline-start" />}
        Add
      </Button>
    </div>
  )
}
