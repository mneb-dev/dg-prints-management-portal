import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { OrderDraft } from "@/lib/order-drafts"
import { formatRelativeDate } from "@/lib/utils"

export function OrderDraftsDialog({
  open,
  onOpenChange,
  drafts,
  onLoad,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  drafts: OrderDraft[]
  onLoad: (draft: OrderDraft) => void
  onDelete: (id: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Draft Orders</DialogTitle>
        </DialogHeader>
        {drafts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No saved drafts yet.</p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col divide-y divide-border overflow-y-auto">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    {draft.fields.customerName.trim() || "Untitled draft"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {draft.fields.items.length} item{draft.fields.items.length === 1 ? "" : "s"} · saved{" "}
                    {formatRelativeDate(draft.updatedAt).toLowerCase()}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={() => onLoad(draft)}>
                    Load
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete draft"
                    onClick={() => onDelete(draft.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
