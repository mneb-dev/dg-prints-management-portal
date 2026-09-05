import { useEffect, useState } from "react"
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
import { useCategoryActions, type Category, type CategoryInput } from "@/lib/categories"

function emptyDraft(): CategoryInput {
  return { name: "", active: true }
}

function draftFromCategory(category: Category): CategoryInput {
  return { name: category.name, active: category.active }
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
      setNameError("Name is required.")
      return
    }
    if (name.length > 60) {
      setNameError("Name must be at most 60 characters.")
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
      <DialogContent className="sm:max-w-md">
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
