import { type CSSProperties, type ReactNode, useState } from "react"
import { type Announcements, closestCenter, DndContext, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import { restrictToVerticalAxis, useReorderSensors } from "@/lib/drag-reorder"
import { cn } from "@/lib/utils"

/** What each row gets to become sortable: put `attachRow`/`rowStyle` on its root element and render
 * `dragHandle` (the grip — the only thing that starts a drag) where the grip belongs. */
export type SortableRowProps = {
  attachRow: (element: HTMLElement | null) => void
  rowStyle: CSSProperties
  dragHandle: ReactNode
  isDragging: boolean
}

/** Smooth drag-to-reorder list (dnd-kit): siblings slide out of the way while dragging, works with
 * touch and keyboard, and the dropped order shows at once while `onReorder` saves it — reverting
 * with a toast if the save fails. Shared by the Settings catalog lists and the Order statuses list. */
export function SortableList<T extends { id: string }>({
  items,
  getLabel,
  onReorder,
  renderItem,
}: {
  items: T[]
  /** Spoken in the screen-reader announcements ("Moved Cash to position 2 of 4"). */
  getLabel: (item: T) => string
  onReorder: (order: string[]) => Promise<void>
  renderItem: (item: T, sortable: SortableRowProps) => ReactNode
}) {
  const sensors = useReorderSensors()
  // The dropped order, held until the save lands and the store catches up — without it the row
  // would snap back to its old spot while the request is in flight.
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)

  const ordered = pendingOrder
    ? [
        ...pendingOrder.flatMap((id) => items.filter((item) => item.id === id)),
        ...items.filter((item) => !pendingOrder.includes(item.id)),
      ]
    : items

  function labelFor(id: UniqueIdentifier) {
    const item = ordered.find((candidate) => candidate.id === id)
    return item ? getLabel(item) : "item"
  }

  function positionOf(id: UniqueIdentifier) {
    return ordered.findIndex((item) => item.id === id) + 1
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${labelFor(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${labelFor(active.id)} is over position ${positionOf(over.id)} of ${ordered.length}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Moved ${labelFor(active.id)} to position ${positionOf(over.id)} of ${ordered.length}.`
        : `Dropped ${labelFor(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelled moving ${labelFor(active.id)}.`,
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const ids = ordered.map((item) => item.id)
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setPendingOrder(next)
    try {
      await onReorder(next)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to reorder.")
    } finally {
      setPendingOrder(null)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      accessibility={{ announcements }}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ordered.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {ordered.map((item) => (
          <SortableRow
            key={item.id}
            id={item.id}
            label={getLabel(item)}
            // One save at a time — a second drop mid-save would race the first.
            disabled={!!pendingOrder || ordered.length < 2}
          >
            {(sortable) => renderItem(item, sortable)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({
  id,
  label,
  disabled,
  children,
}: {
  id: string
  label: string
  disabled: boolean
  children: (sortable: SortableRowProps) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled })

  const dragHandle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Drag to reorder ${label}`}
      className={cn(
        "-ml-1 flex size-6 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  )

  return children({
    attachRow: setNodeRef,
    rowStyle: {
      transform: CSS.Translate.toString(transform),
      transition: transition ?? undefined,
      // Lift the dragged row above its siblings as it slides over them.
      ...(isDragging ? { position: "relative", zIndex: 10 } : {}),
    },
    dragHandle,
    isDragging,
  })
}
