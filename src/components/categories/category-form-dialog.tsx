import { useEffect, useState } from "react"
import { LockIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useCategoryActions, type Category, type CategoryInput } from "@/lib/categories"
import { CATEGORY_STATUS_FLOW_OPTIONS, type OrderStatus } from "@/lib/orders"
import { maxLengthMessage, requiredMessage } from "@/lib/validation"

import { ORDER_STATUS_ICONS, ORDER_STATUS_LABELS } from "@/components/orders/order-status-badge"

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
  return { name: "", active: true, statusFlow: [...MANDATORY_STATUSES] }
}

function draftFromCategory(category: Category): CategoryInput {
  return { name: category.name, active: category.active, statusFlow: category.statusFlow }
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Update this product category's name or status."
              : "Add a new product category admins can assign to products."}
          </DialogDescription>
        </DialogHeader>

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
              <FieldLabel>Status</FieldLabel>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{draft.active ? "Active" : "Inactive"}</span>
                <Switch
                  checked={draft.active}
                  onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, active: checked }))}
                />
              </div>
            </Field>

            <Field>
              <FieldLabel>Order statuses</FieldLabel>
              <p className="text-sm text-muted-foreground">
                Every order starts at Pending and ends at Released — choose which production
                steps happen in between.
              </p>
              <ToggleGroup
                multiple
                value={draft.statusFlow}
                onValueChange={(next) => {
                  const withMandatory = new Set([...next, ...MANDATORY_STATUSES])
                  setDraft((prev) => ({
                    ...prev,
                    statusFlow: CATEGORY_STATUS_FLOW_OPTIONS.filter((status) =>
                      withMandatory.has(status)
                    ),
                  }))
                }}
                className="flex-nowrap items-center gap-1"
              >
                {CATEGORY_STATUS_FLOW_OPTIONS.map((status) => {
                  const locked = MANDATORY_STATUSES.includes(status)
                  const Icon = ORDER_STATUS_ICONS[status]
                  const chip = (
                    <Toggle
                      key={status}
                      value={status}
                      disabled={locked}
                      className={cn(
                        "h-6 shrink-0 gap-1 px-1.5 text-[11px]",
                        locked && "disabled:pointer-events-auto disabled:opacity-100"
                      )}
                    >
                      <Icon className="size-3" />
                      {ORDER_STATUS_LABELS[status]}
                      {locked && <LockIcon className="size-2.5 opacity-70" />}
                    </Toggle>
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
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Saving..." : "Save Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
