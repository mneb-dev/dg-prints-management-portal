import { useEffect, useState } from "react"
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useActiveCategories } from "@/lib/categories"
import {
  ALL_VARIANTS,
  PRODUCT_STATUSES,
  useProductActions,
  type Product,
  type ProductInput,
  type ProductOption,
  type ProductStatus,
} from "@/lib/products"
import { generateId } from "@/lib/utils"
import {
  maxLengthMessage,
  parsePositiveAmount,
  positiveAmountMessage,
  PRICING_INCOMPLETE_VARIANTS_MESSAGE,
  PRICING_NO_VARIANTS_MESSAGE,
  requiredMessage,
} from "@/lib/validation"
import { cartesianOptionCombinations, combinationsMatch } from "@/lib/variant-matrix"

import { VariantPricingTable } from "./variant-pricing-table"

function emptyDraft(): ProductInput {
  return {
    name: "",
    category: "",
    description: "",
    status: "Active",
    options: [],
    pricing: [],
  }
}

function draftFromProduct(product: Product): ProductInput {
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    status: product.status,
    options: product.options,
    pricing: product.pricing,
  }
}

/** True when a product's shape is exactly "no options, one price that applies to everything". */
function isSinglePriceProduct(product: Product): boolean {
  return (
    product.options.length === 0 &&
    product.pricing.length === 1 &&
    product.pricing[0].appliesTo === ALL_VARIANTS
  )
}

function OptionRow({
  option,
  onChange,
  onRemove,
}: {
  option: ProductOption
  onChange: (option: ProductOption) => void
  onRemove: () => void
}) {
  const [isAddingValue, setIsAddingValue] = useState(false)
  const [valueDraft, setValueDraft] = useState("")

  function commitValue() {
    const trimmed = valueDraft.trim()
    const isDuplicate = option.values.some(
      (value) => value.toLowerCase() === trimmed.toLowerCase()
    )
    if (trimmed && !isDuplicate) {
      onChange({ ...option, values: [...option.values, trimmed] })
    }
    setValueDraft("")
    setIsAddingValue(false)
  }

  function removeValue(index: number) {
    onChange({
      ...option,
      values: option.values.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Input
          value={option.name}
          onChange={(event) => onChange({ ...option, name: event.target.value })}
          placeholder="Option name (e.g. Lamination)"
          className="flex-1"
        />
        <label className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
          Required
          <Switch
            checked={option.required}
            onCheckedChange={(checked) =>
              onChange({ ...option, required: !!checked })
            }
          />
        </label>
        <Button variant="ghost" size="icon-sm" onClick={onRemove}>
          <Trash2Icon />
          <span className="sr-only">Remove option</span>
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Values</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {option.values.map((value, index) => (
            <Badge key={`${value}-${index}`} variant="secondary" className="gap-1 pr-1">
              {value}
              <button
                type="button"
                onClick={() => removeValue(index)}
                className="rounded-full p-0.5 hover:bg-foreground/10"
              >
                <XIcon className="size-3" />
                <span className="sr-only">Remove {value}</span>
              </button>
            </Badge>
          ))}
          {isAddingValue ? (
            <Input
              autoFocus
              value={valueDraft}
              onChange={(event) => setValueDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitValue()
                }
                if (event.key === "Escape") {
                  setValueDraft("")
                  setIsAddingValue(false)
                }
              }}
              onBlur={commitValue}
              className="h-6 w-32 px-2 text-xs"
            />
          ) : (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsAddingValue(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Add Value
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onSaved?: () => void
}) {
  const { addProduct, updateProduct } = useProductActions()
  const { categories: activeCategories } = useActiveCategories()
  const [draft, setDraft] = useState<ProductInput>(emptyDraft)
  const [nameError, setNameError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSinglePrice, setIsSinglePrice] = useState(true)
  const [singlePrice, setSinglePrice] = useState("")
  const [singlePriceError, setSinglePriceError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(product ? draftFromProduct(product) : emptyDraft())
    setNameError(null)
    setCategoryError(null)
    setDescriptionError(null)
    setPricingError(null)
    if (product) {
      setIsSinglePrice(isSinglePriceProduct(product))
      setSinglePrice(isSinglePriceProduct(product) ? String(product.pricing[0].price) : "")
    } else {
      setIsSinglePrice(true)
      setSinglePrice("")
    }
    setSinglePriceError(null)
  }, [open, product])

  // Include the currently-assigned category even if it's since been deactivated,
  // so editing an existing product doesn't silently drop its category.
  const categoryOptions =
    draft.category && !activeCategories.some((c) => c.name === draft.category)
      ? [...activeCategories.map((c) => c.name), draft.category]
      : activeCategories.map((c) => c.name)

  function addOption() {
    setDraft((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { id: generateId(), name: "", required: true, values: [] },
      ],
    }))
  }

  function updateOption(id: string, next: ProductOption) {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.map((option) => (option.id === id ? next : option)),
    }))
  }

  function removeOption(id: string) {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.filter((option) => option.id !== id),
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setNameError(requiredMessage("Product name"))
      return
    }

    if (!draft.category) {
      setCategoryError(requiredMessage("Category"))
      return
    }

    if (draft.description.length > 60) {
      setDescriptionError(maxLengthMessage("Description", 60))
      return
    }

    let payload = draft
    if (isSinglePrice) {
      const numericPrice = parsePositiveAmount(singlePrice)
      if (numericPrice === null) {
        setSinglePriceError(positiveAmountMessage("price"))
        return
      }
      const existingEntry =
        product && isSinglePriceProduct(product) ? product.pricing[0] : null
      payload = {
        ...draft,
        options: [],
        pricing: [
          {
            id: existingEntry?.id ?? generateId(),
            appliesTo: ALL_VARIANTS,
            pricingType: "Fixed",
            price: numericPrice,
            unit: "piece",
          },
        ],
      }
    } else {
      const combinations = cartesianOptionCombinations(draft.options)
      if (combinations.length === 0) {
        setPricingError(PRICING_NO_VARIANTS_MESSAGE)
        return
      }
      const hasUnpriced = combinations.some((combination) => {
        const entry = draft.pricing.find(
          (candidate) => candidate.appliesTo !== ALL_VARIANTS && combinationsMatch(candidate.appliesTo, combination)
        )
        return !entry || entry.price <= 0
      })
      if (hasUnpriced) {
        setPricingError(PRICING_INCOMPLETE_VARIANTS_MESSAGE)
        return
      }
      setPricingError(null)
    }

    setIsSubmitting(true)
    try {
      if (product) {
        await updateProduct(product.id, payload)
        toast.success("Product updated.")
      } else {
        await addProduct(payload)
        toast.success("Product created.")
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save product.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit Product" : "Create Product"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Update this product's details, options, and pricing."
              : "Add a new product and configure its options and pricing."}
          </DialogDescription>
        </DialogHeader>

        <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Basic Information</h3>
            <FieldGroup>
              <Field data-invalid={!!nameError}>
                <FieldLabel htmlFor="product-name">Product Name</FieldLabel>
                <Input
                  id="product-name"
                  value={draft.name}
                  onChange={(event) => {
                    setDraft((prev) => ({ ...prev, name: event.target.value }))
                    setNameError(null)
                  }}
                  aria-invalid={!!nameError}
                  placeholder="Sticker"
                />
                <FieldError>{nameError ?? undefined}</FieldError>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!categoryError}>
                  <FieldLabel htmlFor="product-category">Category</FieldLabel>
                  <Select
                    value={draft.category || undefined}
                    onValueChange={(value) => {
                      setDraft((prev) => ({ ...prev, category: value ?? "" }))
                      setCategoryError(null)
                    }}
                    open={categorySelectOpen}
                    onOpenChange={setCategorySelectOpen}
                  >
                    <SelectTrigger id="product-category" className="w-full" aria-invalid={!!categoryError}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{categoryError}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="product-status">Status</FieldLabel>
                  <Select
                    value={draft.status}
                    onValueChange={(value) =>
                      setDraft((prev) => ({
                        ...prev,
                        status: value as ProductStatus,
                      }))
                    }
                  >
                    <SelectTrigger id="product-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field data-invalid={!!descriptionError}>
                <FieldLabel htmlFor="product-description">
                  Description
                </FieldLabel>
                <Textarea
                  id="product-description"
                  value={draft.description}
                  onChange={(event) => {
                    setDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                    setDescriptionError(null)
                  }}
                  placeholder="Custom printed sticker labels"
                  maxLength={60}
                  aria-invalid={!!descriptionError}
                />
                <FieldError>{descriptionError ?? undefined}</FieldError>
              </Field>
            </FieldGroup>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-2">
              <span>
                <span className="text-sm font-medium">Single price</span>
                <p className="text-sm text-muted-foreground">
                  This product has one price and no options or variants.
                </p>
              </span>
              <Switch
                checked={isSinglePrice}
                onCheckedChange={(checked) => setIsSinglePrice(!!checked)}
              />
            </label>

            {isSinglePrice && (
              <Field data-invalid={!!singlePriceError}>
                <FieldLabel htmlFor="product-single-price">Price</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                    ₱
                  </span>
                  <Input
                    id="product-single-price"
                    className="pl-6"
                    type="number"
                    min={0}
                    step="0.01"
                    value={singlePrice}
                    onChange={(event) => {
                      setSinglePrice(event.target.value)
                      setSinglePriceError(null)
                    }}
                    aria-invalid={!!singlePriceError}
                  />
                </div>
                <FieldError>{singlePriceError ?? undefined}</FieldError>
              </Field>
            )}
          </div>

          {!isSinglePrice && (
            <>
              <Separator />

              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-medium">Product Options</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure the options customers can select for this product.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {draft.options.map((option) => (
                    <OptionRow
                      key={option.id}
                      option={option}
                      onChange={(next) => updateOption(option.id, next)}
                      onRemove={() => removeOption(option.id)}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={addOption}
                >
                  <PlusIcon data-icon="inline-start" />
                  Add Option
                </Button>
              </div>

              <Separator />

              <div className="flex flex-col gap-3" data-invalid={!!pricingError}>
                <div>
                  <h3 className="text-sm font-medium">Pricing</h3>
                  <p className="text-sm text-muted-foreground">
                    Set a price for every combination of the variations above.
                  </p>
                </div>

                <VariantPricingTable
                  options={draft.options}
                  pricing={draft.pricing}
                  onChange={(pricing) => {
                    setDraft((prev) => ({ ...prev, pricing }))
                    setPricingError(null)
                  }}
                />
                <FieldError>{pricingError ?? undefined}</FieldError>
              </div>
            </>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Saving..." : "Save Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
