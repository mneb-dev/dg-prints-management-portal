import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LayersIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { CharCount } from "@/components/char-count"
import { ChoiceCard } from "@/components/choice-card"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FormStepper } from "@/components/form-stepper"
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
import { ToggleGroup } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useActiveCategories } from "@/lib/categories"
import {
  ALL_VARIANTS,
  useProductActions,
  type Product,
  type ProductInput,
  type ProductOption,
} from "@/lib/products"
import { cn, formatCurrency, generateId } from "@/lib/utils"
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
    showInShop: false,
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
    showInShop: product.showInShop,
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

const STEPS = [{ title: "Details" }, { title: "Pricing" }, { title: "Review" }]
const DETAILS_STEP = 0
const PRICING_STEP = 1
const REVIEW_STEP = 2

type StepIssue = {
  field: "name" | "category" | "description" | "singlePrice" | "pricing"
  message: string
}

/** Where to put focus for each kind of error (the first invalid field on its step). */
const ISSUE_FOCUS_ID: Record<StepIssue["field"], string> = {
  name: "product-name",
  category: "product-category",
  description: "product-description",
  singlePrice: "product-single-price",
  pricing: "product-add-option",
}

/** A labelled on/off row for the Review step. */
function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal" className="items-start justify-between gap-4 px-4 py-3">
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription className="text-xs">{description}</FieldDescription>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={(next) => onCheckedChange(!!next)} />
    </Field>
  )
}

/** One summary line on the Review step, with an "Edit" jump back to the step that owns it. */
function SummaryRow({
  label,
  children,
  onEdit,
}: {
  label: string
  children: ReactNode
  onEdit: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="min-w-0 text-sm">{children}</div>
      </div>
      <Button type="button" variant="ghost" size="sm" className="-mr-2 shrink-0" onClick={onEdit}>
        <PencilIcon data-icon="inline-start" />
        Edit
      </Button>
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
  const isEditing = !!product
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
  const [showDescription, setShowDescription] = useState(false)
  const [step, setStep] = useState(DETAILS_STEP)
  // Furthest step reached — in create mode, the stepper only lets you jump back up to here.
  const [furthestStep, setFurthestStep] = useState(DETAILS_STEP)
  const [direction, setDirection] = useState<"forward" | "back">("forward")
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  // Snapshot of the form as opened, so closing can tell whether anything would be lost.
  const initialSnapshot = useRef("")

  useEffect(() => {
    if (!open) return
    const nextDraft = product ? draftFromProduct(product) : emptyDraft()
    const nextIsSinglePrice = product ? isSinglePriceProduct(product) : true
    const nextSinglePrice = product && nextIsSinglePrice ? String(product.pricing[0].price) : ""
    setDraft(nextDraft)
    setIsSinglePrice(nextIsSinglePrice)
    setSinglePrice(nextSinglePrice)
    setNameError(null)
    setCategoryError(null)
    setDescriptionError(null)
    setPricingError(null)
    setSinglePriceError(null)
    setShowDescription(!!product?.description)
    setStep(DETAILS_STEP)
    setFurthestStep(product ? REVIEW_STEP : DETAILS_STEP)
    setDirection("forward")
    initialSnapshot.current = JSON.stringify([nextDraft, nextIsSinglePrice, nextSinglePrice])
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

  /** The first problem on a step, without touching any error state. */
  function stepIssue(index: number): StepIssue | null {
    if (index === DETAILS_STEP) {
      if (!draft.name.trim()) return { field: "name", message: requiredMessage("Product name") }
      if (!draft.category) return { field: "category", message: requiredMessage("Category") }
      if (draft.description.length > 60) {
        return { field: "description", message: maxLengthMessage("Description", 60) }
      }
    }
    if (index === PRICING_STEP) {
      if (isSinglePrice) {
        if (parseNonNegativeAmount(singlePrice) === null) {
          return { field: "singlePrice", message: nonNegativeAmountMessage("price") }
        }
      } else {
        const combinations = cartesianOptionCombinations(draft.options)
        if (combinations.length === 0) return { field: "pricing", message: PRICING_NO_VARIANTS_MESSAGE }
        const hasUnpriced = combinations.some((combination) => {
          const entry = draft.pricing.find(
            (candidate) => candidate.appliesTo !== ALL_VARIANTS && combinationsMatch(candidate.appliesTo, combination)
          )
          return !entry || entry.price < 0
        })
        if (hasUnpriced) return { field: "pricing", message: PRICING_INCOMPLETE_VARIANTS_MESSAGE }
      }
    }
    return null
  }

  function showIssue(issue: StepIssue) {
    const setters = {
      name: setNameError,
      category: setCategoryError,
      description: setDescriptionError,
      singlePrice: setSinglePriceError,
      pricing: setPricingError,
    }
    setters[issue.field](issue.message)
    if (issue.field === "description") setShowDescription(true)
    // Wait for the step's fields to mount before focusing.
    requestAnimationFrame(() => document.getElementById(ISSUE_FOCUS_ID[issue.field])?.focus())
  }

  function moveTo(index: number) {
    setDirection(index < step ? "back" : "forward")
    setStep(index)
    setFurthestStep((prev) => Math.max(prev, index))
  }

  /** Go to a step. Going forward validates every step in between and stops at the first bad one. */
  function goTo(target: number) {
    if (target === step) return
    if (target > step) {
      for (let index = step; index < target; index++) {
        const issue = stepIssue(index)
        if (issue) {
          if (index !== step) moveTo(index)
          showIssue(issue)
          return
        }
      }
    }
    moveTo(target)
  }

  function buildPayload(): ProductInput {
    if (!isSinglePrice) return draft
    const existingEntry = product && isSinglePriceProduct(product) ? product.pricing[0] : null
    return {
      ...draft,
      options: [],
      pricing: [
        {
          id: existingEntry?.id ?? generateId(),
          appliesTo: ALL_VARIANTS,
          pricingType: "Fixed",
          price: parseNonNegativeAmount(singlePrice) ?? 0,
          unit: "piece",
        },
      ],
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Creating: Enter / the primary button walks forward until the last step.
    if (!isEditing && step < REVIEW_STEP) {
      goTo(step + 1)
      return
    }

    for (const index of [DETAILS_STEP, PRICING_STEP]) {
      const issue = stepIssue(index)
      if (issue) {
        if (index !== step) moveTo(index)
        showIssue(issue)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload = buildPayload()
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

  function requestClose() {
    if (isSubmitting) return
    const isDirty = JSON.stringify([draft, isSinglePrice, singlePrice]) !== initialSnapshot.current
    if (isDirty) setConfirmDiscardOpen(true)
    else onOpenChange(false)
  }

  const completedSteps = new Set(
    [DETAILS_STEP, PRICING_STEP, REVIEW_STEP].filter(
      (index) => index < furthestStep && stepIssue(index) === null
    )
  )

  const combinations = isSinglePrice ? [] : cartesianOptionCombinations(draft.options)
  const variantPrices = draft.pricing.map((entry) => entry.price).filter((price) => price > 0)
  const isActive = draft.status === "Active"

  const stepAnimation = cn(
    "flex animate-in flex-col gap-5 duration-200 fade-in-0 motion-reduce:animate-none",
    direction === "forward" ? "slide-in-from-right-2" : "slide-in-from-left-2"
  )

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent className="sm:max-w-2xl">
          <FormDialogHeader
            icon={PackageIcon}
            title={product ? "Edit product" : "New product"}
            description={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step].title}`}
          />

          <FormStepper
            steps={STEPS}
            current={step}
            completed={completedSteps}
            canNavigate={(index) => isEditing || index <= furthestStep}
            onStepClick={goTo}
          />

          <form id="product-form" onSubmit={handleSubmit} noValidate className="min-h-64 py-1">
            {step === DETAILS_STEP && (
              <FieldGroup key="details" className={stepAnimation}>
                <Field data-invalid={!!nameError}>
                  <FieldLabel htmlFor="product-name">Product name</FieldLabel>
                  <Input
                    id="product-name"
                    autoFocus
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
                          value ? <span className="truncate">{value}</span> : "Select a category"
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

                {showDescription ? (
                  <Field
                    data-invalid={!!descriptionError}
                    className="animate-in duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <FieldLabel htmlFor="product-description">
                        Description <span className="font-normal text-muted-foreground">(optional)</span>
                      </FieldLabel>
                      <CharCount value={draft.description} max={60} />
                    </div>
                    <Textarea
                      id="product-description"
                      value={draft.description}
                      onChange={(event) => {
                        setDraft((prev) => ({ ...prev, description: event.target.value }))
                        setDescriptionError(null)
                      }}
                      placeholder="e.g. Custom printed sticker labels"
                      maxLength={60}
                      aria-invalid={!!descriptionError}
                    />
                    <FieldError>{descriptionError ?? undefined}</FieldError>
                  </Field>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 w-fit text-muted-foreground"
                    onClick={() => {
                      setShowDescription(true)
                      requestAnimationFrame(() => document.getElementById("product-description")?.focus())
                    }}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Add description
                  </Button>
                )}
              </FieldGroup>
            )}

            {step === PRICING_STEP && (
              <div key="pricing" className={stepAnimation}>
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
                        id="product-add-option"
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
              </div>
            )}

            {step === REVIEW_STEP && (
              <div key="review" className={stepAnimation}>
                <div className="divide-y rounded-xl border bg-card">
                  <SummaryRow label="Product" onEdit={() => goTo(DETAILS_STEP)}>
                    <div className="truncate font-medium">{draft.name || "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {draft.category || "No category"}
                      {draft.description && ` · ${draft.description}`}
                    </div>
                  </SummaryRow>
                  <SummaryRow label="Pricing" onEdit={() => goTo(PRICING_STEP)}>
                    {isSinglePrice ? (
                      <span className="font-medium tabular-nums">
                        {formatCurrency(parseNonNegativeAmount(singlePrice) ?? 0)}
                        <span className="font-normal text-muted-foreground"> · one price</span>
                      </span>
                    ) : (
                      <>
                        <div className="font-medium tabular-nums">
                          {variantPrices.length === 0
                            ? "Not priced yet"
                            : Math.min(...variantPrices) === Math.max(...variantPrices)
                              ? formatCurrency(variantPrices[0])
                              : `${formatCurrency(Math.min(...variantPrices))} – ${formatCurrency(Math.max(...variantPrices))}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {draft.options.length} {draft.options.length === 1 ? "option" : "options"} ·{" "}
                          {combinations.length} {combinations.length === 1 ? "combination" : "combinations"}
                        </div>
                      </>
                    )}
                  </SummaryRow>
                </div>

                <div className="divide-y rounded-xl border bg-card">
                  <SwitchRow
                    id="product-available"
                    label="Available for new orders"
                    description="Turn off to hide it from new orders. Order history keeps it either way."
                    checked={isActive}
                    onCheckedChange={(checked) =>
                      setDraft((prev) => ({ ...prev, status: checked ? "Active" : "Inactive" }))
                    }
                  />
                  <SwitchRow
                    id="product-show-in-shop"
                    label="Show in online shop"
                    description={
                      draft.showInShop && !isActive ? (
                        <span className="text-order-status-gold">
                          Won't appear in the shop while it's unavailable.
                        </span>
                      ) : (
                        "List this product on the online shop."
                      )
                    }
                    checked={draft.showInShop}
                    onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, showInShop: checked }))}
                  />
                </div>
              </div>
            )}
          </form>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="ghost" onClick={requestClose}>
              Cancel
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {step > DETAILS_STEP && (
                <Button type="button" variant="outline" onClick={() => goTo(step - 1)}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Back
                </Button>
              )}
              {isEditing && step < REVIEW_STEP && (
                <Button type="button" variant="outline" onClick={() => goTo(step + 1)}>
                  Next
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              )}
              <Button type="submit" form="product-form" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting ? (
                  "Saving…"
                ) : isEditing ? (
                  "Save changes"
                ) : step < REVIEW_STEP ? (
                  <>
                    Next
                    <ArrowRightIcon data-icon="inline-end" />
                  </>
                ) : (
                  "Create product"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        tone="warning"
        icon={TriangleAlertIcon}
        title="Discard changes?"
        description={
          isEditing ? "Your edits to this product won't be saved." : "This new product won't be saved."
        }
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
