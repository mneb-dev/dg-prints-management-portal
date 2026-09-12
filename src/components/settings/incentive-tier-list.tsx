import { useEffect, useState } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
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
import { CurrencyInput } from "@/components/ui/currency-input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { IncentiveTier } from "@/lib/incentive-tiers"

/** Add/edit/delete list for the Sales-Target Bonus tier ladder — structurally mirrors
 * CatalogList's inline-edit/AlertDialog-delete/AddRow conventions, adapted for two numeric
 * fields (threshold, amount) per row instead of one text field, and no manual reordering
 * (the list is always threshold-sorted). Relies on the Settings page's own route guard for
 * permission gating, same as CatalogList — no internal permission check here. */
export function IncentiveTierList({
  tiers,
  isLoading,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tiers: IncentiveTier[]
  isLoading?: boolean
  onAdd: (threshold: number, amount: number) => Promise<void>
  onUpdate: (id: string, input: { threshold?: number; amount?: number }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [pendingDelete, setPendingDelete] = useState<IncentiveTier | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const canDelete = tiers.length > 1

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await onDelete(pendingDelete.id)
      setPendingDelete(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete tier.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-lg border">
        <div className="flex items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="flex-1">Total sale reaches</span>
          <span className="flex-1">Team earns</span>
          <span className="w-6 shrink-0" />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2.5">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : tiers.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">No tiers yet.</p>
        ) : (
          tiers.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              canDelete={canDelete}
              onUpdate={(input) => onUpdate(tier.id, input)}
              onDeleteRequest={() => setPendingDelete(tier)}
            />
          ))
        )}
        <AddTierRow onAdd={onAdd} />
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tier?</AlertDialogTitle>
            <AlertDialogDescription>
              This won't change any month that's already been released — only future and
              not-yet-released calculations.
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

function TierRow({
  tier,
  canDelete,
  onUpdate,
  onDeleteRequest,
}: {
  tier: IncentiveTier
  canDelete: boolean
  onUpdate: (input: { threshold?: number; amount?: number }) => Promise<void>
  onDeleteRequest: () => void
}) {
  const deleteButton = (
    <Button variant="ghost" size="icon-sm" className="size-6" disabled={!canDelete} onClick={onDeleteRequest}>
      <Trash2Icon className="size-3.5" />
      <span className="sr-only">Delete tier</span>
    </Button>
  )

  return (
    <div className="flex items-center gap-1.5 border-b px-2 py-1 last:border-b-0">
      <EditableAmount value={tier.threshold} onCommit={(threshold) => onUpdate({ threshold })} />
      <EditableAmount value={tier.amount} onCommit={(amount) => onUpdate({ amount })} />
      {canDelete ? (
        deleteButton
      ) : (
        <Tooltip>
          <TooltipTrigger render={deleteButton} />
          <TooltipContent>At least one tier is required.</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function EditableAmount({ value, onCommit }: { value: number; onCommit: (value: number) => Promise<void> }) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])

  async function commit() {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Must be a positive number.")
      setDraft(String(value))
      return
    }
    if (parsed === value) {
      setDraft(String(value))
      return
    }
    try {
      await onCommit(parsed)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update tier.")
      setDraft(String(value))
    }
  }

  return (
    <CurrencyInput
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur()
        if (event.key === "Escape") setDraft(String(value))
      }}
      className="h-7 flex-1 text-sm"
    />
  )
}

function AddTierRow({ onAdd }: { onAdd: (threshold: number, amount: number) => Promise<void> }) {
  const [threshold, setThreshold] = useState("")
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parsedThreshold = Number(threshold)
  const parsedAmount = Number(amount)
  const isValid =
    threshold.trim() !== "" &&
    amount.trim() !== "" &&
    Number.isFinite(parsedThreshold) &&
    parsedThreshold > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0

  async function submit() {
    if (!isValid) return
    setIsSubmitting(true)
    try {
      await onAdd(parsedThreshold, parsedAmount)
      setThreshold("")
      setAmount("")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to add tier.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 border-t p-1.5">
      <CurrencyInput
        value={threshold}
        onChange={(event) => setThreshold(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        placeholder="New threshold"
        disabled={isSubmitting}
        className="h-7 flex-1 text-sm"
      />
      <CurrencyInput
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        placeholder="New amount"
        disabled={isSubmitting}
        className="h-7 flex-1 text-sm"
      />
      <Button size="icon-sm" className="size-7 shrink-0" onClick={submit} disabled={isSubmitting || !isValid}>
        {isSubmitting ? <Spinner className="size-3.5" /> : <PlusIcon className="size-3.5" />}
      </Button>
    </div>
  )
}
