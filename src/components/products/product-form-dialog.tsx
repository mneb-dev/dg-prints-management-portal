import { useEffect, useState } from "react"
import {
  LayersIcon,
  PackageIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { CharCount } from "@/components/char-count"
import { ChoiceCard } from "@/components/choice-card"
import { FormSection } from "@/components/form-section"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FormDialogHeader } from "@/components/form-dialog-header"
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
import { cn, generateId } from "@/lib/utils"
import {
  maxLengthMessage,
  nonNegativeAmountMessage,
  parseNonNegativeAmount,
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
  const [valueDraft, setValueDraft] = useState("")

  // Enter adds the typed value; commas add several at once ("Glossy, Matte"). Blank and
  // duplicate (case-insensitive) values are skipped.
  function commitValue() {
    const incoming = valueDraft
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    if (incoming.length === 0) {
      setValueDraft("")
      return
    }
    const seen = new Set(option.values.map((value) => value.toLowerCase()))
    const additions: string[] = []
    for (const value of incoming) {
      const key = value.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      additions.push(value)
    }
    if (additions.length > 0) onChange({ ...option, values: [...option.values, ...additions] })
    setValueDraft("")
  }

  function removeValue(index: number) {
    onChange({
      ...option,
      values: option.values.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="flex animate-in flex-col gap-3 rounded-xl border bg-muted/20 p-3 duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none">
      <div className="flex items-center gap-2">
        <Input
          value={option.name}
          onChange={(event) => onChange({ ...option, name: event.target.value })}
          placeholder="Option name (e.g. Lamination)"
          aria-label="Option name"
          className="flex-1 bg-card"
        />
        <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
          <Switch
            size="sm"
            checked={option.required}
            onCheckedChange={(checked) => onChange({ ...option, required: !!checked })}
          />
          Required
        </label>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRemove}
                aria-label="Remove option"
                className="hover:bg-destructive/10 hover:text-destructive"
              />
            }
          >
            <Trash2Icon />
          </TooltipTrigger>
          <TooltipContent>Remove option</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {option.values.map((value, index) => (
            <Badge key={`${value}-${index}`} variant="secondary" className="animate-in gap-1 pr-1 duration-150 fade-in-0 zoom-in-95 motion-reduce:animate-none">
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
          <Input
            value={valueDraft}
            onChange={(event) => setValueDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitValue()
              }
              if (event.key === "Escape") setValueDraft("")
            }}
            onBlur={commitValue}
            placeholder={option.values.length === 0 ? "Add values…" : "Add a value…"}
            aria-label={`Add a value to ${option.name || "this option"}`}
            className="h-7 w-36 bg-card px-2 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground">Press Enter to add — separate several with commas.</span>
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
      const numericPrice = parseNonNegativeAmount(singlePrice)
      if (numericPrice === null) {
        setSinglePriceError(nonNegativeAmountMessage("price"))
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
        return !entry || entry.price < 0
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
      <DialogContent className="sm:max-w-2xl">
        <FormDialogHeader
          icon={PackageIcon}
          title={product ? "Edit product" : "New product"}
          description={
            product
              ? "Update this product's details, options, and pricing."
              : "Add a new product and configure its options and pricing."
          }
        />

        <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
          <FormSection step={1} title="Basics" description="What it is and whether staff can sell it.">
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!nameError}>
                  <FieldLabel htmlFor="product-name">Product name</FieldLabel>
                  <Input
                    id="product-name"
                    value={draft.name}
                    onChange={(event) => {
                      setDraft((prev) => ({ ...prev, name: event.target.value }))
                      setNameError(null)
                    }}
                    aria-invalid={!!nameError}
                    placeholder="e.g. Die-cut Sticker"
                  />
                  <FieldError>{nameError ?? undefined}</FieldError>
                </Field>

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
                      <SelectValue placeholder="Select a category">
                        {(value: string | null) =>
                          value ? (
                            <span className="truncate">{value}</span>
                          ) : (
                            "Select a category"
                          )
                        }
                      </SelectValue>
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
              </div>

              <Field>
                <FieldLabel htmlFor="product-status">Status</FieldLabel>
                <ToggleGroup
                  id="product-status"
                  aria-label="Product status"
                  value={[draft.status]}
                  onValueChange={(next) => {
                    const value = next[0] as ProductStatus | undefined
                    if (value) setDraft((prev) => ({ ...prev, status: value }))
                  }}
                  className={cn(SEGMENT_TRACK_CLASS, "w-fit")}
                >
                  {PRODUCT_STATUSES.map((status) => (
                    <Toggle key={status} value={status} className={SEGMENT_CLASS}>
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 shrink-0 translate-y-px rounded-full",
                          status === "Active" ? "bg-order-status-teal" : "bg-muted-foreground/40"
                        )}
                      />
                      <span className="leading-none">{status}</span>
                    </Toggle>
                  ))}
                </ToggleGroup>
                <FieldDescription className="text-xs">
                  Inactive products are hidden from new orders but kept for order history.
                </FieldDescription>
              </Field>

              <Field data-invalid={!!descriptionError}>
                <div className="flex items-baseline justify-between gap-2">
                  <FieldLabel htmlFor="product-description">Description</FieldLabel>
                  <CharCount value={draft.description} max={60} />
                </div>
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
                  placeholder="e.g. Custom printed sticker labels"
                  maxLength={60}
                  aria-invalid={!!descriptionError}
                />
                <FieldError>{descriptionError ?? undefined}</FieldError>
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection step={2} title="Pricing" description="How this product is priced.">
            {/* The biggest decision in the form, so it's two clear choice cards instead of a
                small switch. Keyboard: arrow keys move between the two (ToggleGroup). */}
            <ToggleGroup
              aria-label="Pricing mode"
              value={[isSinglePrice ? "single" : "variants"]}
              onValueChange={(next) => {
                const value = next[0]
                if (value) setIsSinglePrice(value === "single")
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <ChoiceCard
                value="single"
                icon={TagIcon}
                title="One price"
                description="Same price for every order."
              />
              <ChoiceCard
                value="variants"
                icon={LayersIcon}
                title="Options & variants"
                description="Customers pick options; each combination has its own price."
              />
            </ToggleGroup>

            {isSinglePrice ? (
              <Field
                key="single"
                data-invalid={!!singlePriceError}
                className="animate-in duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none sm:max-w-xs"
              >
                <FieldLabel htmlFor="product-single-price">Price</FieldLabel>
                <CurrencyInput
                  id="product-single-price"
                  value={singlePrice}
                  onChange={(event) => {
                    setSinglePrice(event.target.value)
                    setSinglePriceError(null)
                  }}
                  aria-invalid={!!singlePriceError}
                />
                <FieldError>{singlePriceError ?? undefined}</FieldError>
              </Field>
            ) : (
              <div
                key="variants"
                className="flex animate-in flex-col gap-6 duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <h4 className="text-sm font-medium">Options</h4>
                    <p className="text-xs text-muted-foreground">What customers choose, e.g. Size or Finish.</p>
                  </div>
                  {draft.options.map((option) => (
                    <OptionRow
                      key={option.id}
                      option={option}
                      onChange={(next) => updateOption(option.id, next)}
                      onRemove={() => removeOption(option.id)}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full border-dashed text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    onClick={addOption}
                  >
                    <PlusIcon data-icon="inline-start" />
                    {draft.options.length === 0 ? "Add an option" : "Add another option"}
                  </Button>
                </div>

                <div className="flex flex-col gap-3" data-invalid={!!pricingError}>
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
              </div>
            )}
          </FormSection>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
