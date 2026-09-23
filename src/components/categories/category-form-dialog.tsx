import { useEffect, useState } from "react"
import { LockIcon, TagIcon } from "lucide-react"
import { toast } from "sonner"

import { StatusFlowPath } from "@/components/categories/status-flow-path"
import { ChoiceTile } from "@/components/choice-tile"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Button } from "@/components/ui/button"
import { FormDialogHeader } from "@/components/form-dialog-header"
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useCategoryActions, type Category, type CategoryInput } from "@/lib/categories"
import { useActiveOrderStatuses, useOrderStatusLookup } from "@/lib/order-statuses"
import { getCategoryStatusFlowOptions, type OrderStatus } from "@/lib/orders"
import { maxLengthMessage, requiredMessage } from "@/lib/validation"

// Why each locked status can't be unchecked — shown in a tooltip so the lock reads as
// intentional rather than a bug (see the status picker below).
const MANDATORY_STATUS_REASON: Partial<Record<OrderStatus, string>> = {
  pending: "Every order starts at Pending.",
  released: "Every order ends at Released.",
}

// Every category's flow must include a start and end state — see category-form-dialog's
// status picker, which renders these two as always-checked and disabled.
const MANDATORY_STATUSES: OrderStatus[] = ["pending", "released"]

function emptyDraft(): CategoryInput {
  return { name: "", active: true, statusFlow: [...MANDATORY_STATUSES], commonSizes: [] }
}

function draftFromCategory(category: Category): CategoryInput {
  // Preserves commonSizes as-is (never reset to []) — this dialog has no UI for editing
  // quick sizes (that lives in App Settings), so saving a category here must not silently
  // wipe out Settings-configured sizes.
  return {
    name: category.name,
    active: category.active,
    statusFlow: category.statusFlow,
    commonSizes: category.commonSizes,
  }
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  onSaved?: () => void
}) {
  const { addCategory, updateCategory } = useCategoryActions()
  const { statuses } = useActiveOrderStatuses()
  const { getLabel, getColors } = useOrderStatusLookup()
  const statusFlowOptions = getCategoryStatusFlowOptions(statuses)
  const [draft, setDraft] = useState<CategoryInput>(emptyDraft)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(category ? draftFromCategory(category) : emptyDraft())
    setNameError(null)
  }, [open, category])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = draft.name.trim()
    if (!name) {
      setNameError(requiredMessage("Name"))
      return
    }
    if (name.length > 60) {
      setNameError(maxLengthMessage("Name", 60))
      return
    }

    setIsSubmitting(true)
    try {
      if (category) {
        await updateCategory(category.id, { ...draft, name })
        toast.success("Category updated.")
      } else {
        await addCategory({ ...draft, name })
        toast.success("Category created.")
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save category.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <FormDialogHeader
          icon={TagIcon}
          title={<>{category ? "Edit category" : "New category"}</>}
          description={<>{category ? "Update this product category's name or status." : "Add a new product category admins can assign to products."}</>}
        />

        <form id="category-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field data-invalid={!!nameError}>
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input
                id="category-name"
                value={draft.name}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                  setNameError(null)
                }}
                aria-invalid={!!nameError}
                placeholder="e.g. Sticker"
              />
              <FieldError>{nameError}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="category-status">Status</FieldLabel>
              <ToggleGroup
                id="category-status"
                aria-label="Category status"
                value={[draft.active ? "active" : "inactive"]}
                onValueChange={(next) => {
                  const value = next[0]
                  if (value) setDraft((prev) => ({ ...prev, active: value === "active" }))
                }}
                className={cn(SEGMENT_TRACK_CLASS, "w-fit")}
              >
                {(["active", "inactive"] as const).map((value) => (
                  <Toggle key={value} value={value} className={SEGMENT_CLASS}>
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0 translate-y-px rounded-full",
                        value === "active" ? "bg-order-status-teal" : "bg-muted-foreground/40"
                      )}
                    />
                    <span className="leading-none">{value === "active" ? "Active" : "Inactive"}</span>
                  </Toggle>
                ))}
              </ToggleGroup>
              <FieldDescription className="text-xs">
                Inactive categories can't be picked for new products.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Order flow</FieldLabel>
              <FieldDescription className="text-xs">
                Every order starts at Pending and ends at Released — pick the production steps in
                between.
              </FieldDescription>
              <ToggleGroup
                multiple
                value={draft.statusFlow}
                onValueChange={(next) => {
                  const withMandatory = new Set([...next, ...MANDATORY_STATUSES])
                  setDraft((prev) => ({
                    ...prev,
                    statusFlow: statusFlowOptions.filter((status) => withMandatory.has(status)),
                  }))
                }}
                className="flex-wrap gap-2"
              >
                {statusFlowOptions.map((status) => {
                  const locked = MANDATORY_STATUSES.includes(status)
                  // Wrapping ✓ tiles (same as the order form's choices); each carries its status
                  // dot. Pending/Released stay selected and locked, with the reason on hover.
                  const chip = (
                    <ChoiceTile
                      key={status}
                      value={status}
                      disabled={locked}
                      className={cn(locked && "disabled:pointer-events-auto disabled:opacity-100")}
                    >
                      <span
                        aria-hidden
                        className={cn("size-2 shrink-0 translate-y-px rounded-full", getColors(status).solid)}
                      />
                      <span className="leading-none">{getLabel(status)}</span>
                      {locked && <LockIcon aria-hidden className="size-3 opacity-60" />}
                    </ChoiceTile>
                  )
                  return locked ? (
                    <Tooltip key={status}>
                      <TooltipTrigger render={chip} />
                      <TooltipContent>{MANDATORY_STATUS_REASON[status]}</TooltipContent>
                    </Tooltip>
                  ) : (
                    chip
                  )
                })}
              </ToggleGroup>
              {/* Live preview of the exact flow being built — the same path the categories table shows. */}
              <div className="mt-1 flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground">Orders in this category go</span>
                <StatusFlowPath statuses={draft.statusFlow} showLabels />
              </div>
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Saving…" : category ? "Save changes" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
