import { useEffect, useState } from "react"
import { ArrowRightIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { IncentiveTier } from "@/lib/incentive-tiers"
import { formatCurrency } from "@/lib/utils"

// Shared grid so the header, every tier row and the add row line their columns up. Phones drop the
// tier column and put the tier badge on its own line above the two amounts.
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)_2rem] items-center gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_1rem_minmax(0,1fr)_2rem]"

function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount)
}

/** Add/edit/delete list for the Sales-target bonus tier ladder — the same inline-edit /
 * confirm-delete / add-row conventions as CatalogList, with two amounts per row (threshold →
 * reward) and no manual reordering (the list is always threshold-sorted). Relies on the Settings
 * page's own route guard for permission gating, same as CatalogList. */
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
    <div className="flex w-full flex-col gap-2">
      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-soft)]">
        <div className={`${ROW_GRID} border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground`}>
          <span className="max-sm:hidden">Tier</span>
          <span>When team sales reach</span>
          <span />
          <span>Team earns</span>
          <span />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : tiers.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No tiers yet. Add the first one below.</p>
        ) : (
          tiers.map((tier, index) => (
            <TierRow
              key={tier.id}
              tier={tier}
              step={index + 1}
              canDelete={canDelete}
              onUpdate={(input) => onUpdate(tier.id, input)}
              onDeleteRequest={() => setPendingDelete(tier)}
            />
          ))
        )}
        <AddTierRow onAdd={onAdd} />
      </div>

      {/* The whole ladder in one line, so the progression reads at a glance. */}
      {tiers.length > 0 ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          {tiers.map((tier) => `${formatCompactCurrency(tier.threshold)} → ${formatCurrency(tier.amount)}`).join("  ·  ")}
        </p>
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        tone="danger"
        icon={Trash2Icon}
        title="Delete this incentive tier?"
        description="Months already released don't change — only future and unreleased calculations."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

function TierRow({
  tier,
  step,
  canDelete,
  onUpdate,
  onDeleteRequest,
}: {
  tier: IncentiveTier
  step: number
  canDelete: boolean
  onUpdate: (input: { threshold?: number; amount?: number }) => Promise<void>
  onDeleteRequest: () => void
}) {
  const deleteButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={!canDelete}
      onClick={onDeleteRequest}
      className="hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2Icon />
      <span className="sr-only">Delete tier {step}</span>
    </Button>
  )

  return (
    <div className={`${ROW_GRID} min-h-11 border-b px-3 py-1.5 transition-colors hover:bg-muted/30`}>
      <Badge variant="secondary" className="col-span-full w-fit tabular-nums sm:col-span-1">
        Tier {step}
      </Badge>
      <EditableAmount
        label={`Tier ${step} threshold`}
        value={tier.threshold}
        onCommit={(threshold) => onUpdate({ threshold })}
      />
      <ArrowRightIcon aria-hidden className="size-4 text-muted-foreground" />
      <EditableAmount label={`Tier ${step} reward`} value={tier.amount} onCommit={(amount) => onUpdate({ amount })} />
      {canDelete ? (
        deleteButton
      ) : (
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} className="flex" />}>{deleteButton}</TooltipTrigger>
          <TooltipContent>At least one tier is required.</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function EditableAmount({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (value: number) => Promise<void>
}) {
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
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur()
        if (event.key === "Escape") setDraft(String(value))
      }}
      className="h-8 tabular-nums"
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
    <div className="flex flex-col gap-2 border-t bg-muted/20 p-2 sm:flex-row sm:items-center">
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)] items-center gap-2">
        <CurrencyInput
          aria-label="New tier threshold"
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder="New threshold"
          disabled={isSubmitting}
          className="h-8 bg-background"
        />
        <ArrowRightIcon aria-hidden className="size-4 text-muted-foreground" />
        <CurrencyInput
          aria-label="New tier reward"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder="New reward"
          disabled={isSubmitting}
          className="h-8 bg-background"
        />
      </div>
      <Button size="sm" className="shrink-0" onClick={submit} disabled={isSubmitting || !isValid}>
        {isSubmitting && <Spinner data-icon="inline-start" />}
        Add tier
      </Button>
    </div>
  )
}
