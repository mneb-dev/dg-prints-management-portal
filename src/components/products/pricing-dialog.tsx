import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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
import {
  ALL_VARIANTS,
  PRICING_TYPES,
  PRICING_UNITS,
  type PricingEntry,
  type PricingType,
  type PricingUnit,
} from "@/lib/products"
import { generateId } from "@/lib/utils"

export function PricingDialog({
  open,
  onOpenChange,
  appliesToOptions,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appliesToOptions: string[]
  onAdd: (entry: PricingEntry) => void
}) {
  const [appliesTo, setAppliesTo] = useState(ALL_VARIANTS)
  const [pricingType, setPricingType] = useState<PricingType>("Package")
  const [packageName, setPackageName] = useState("")
  const [price, setPrice] = useState("")
  const [unit, setUnit] = useState<PricingUnit>("Package")
  const [priceError, setPriceError] = useState<string | null>(null)
  const [packageNameError, setPackageNameError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAppliesTo(appliesToOptions[0] ?? ALL_VARIANTS)
    setPricingType("Package")
    setPackageName("")
    setPrice("")
    setUnit("Package")
    setPriceError(null)
    setPackageNameError(null)
  }, [open, appliesToOptions])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (pricingType === "Package" && !packageName.trim()) {
      setPackageNameError("Package name is required.")
      return
    }

    const numericPrice = Number(price)
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setPriceError("Enter a valid price.")
      return
    }

    onAdd({
      id: generateId(),
      appliesTo,
      pricingType,
      packageName: pricingType === "Package" ? packageName : undefined,
      price: numericPrice,
      unit,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Pricing</DialogTitle>
        </DialogHeader>
        <form id="pricing-form" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pricing-applies-to">Applies To</FieldLabel>
              <Select
                value={appliesTo}
                onValueChange={(value) => setAppliesTo(value as string)}
              >
                <SelectTrigger id="pricing-applies-to" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appliesToOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="pricing-type">Pricing Type</FieldLabel>
              <Select
                value={pricingType}
                onValueChange={(value) => setPricingType(value as PricingType)}
              >
                <SelectTrigger id="pricing-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {pricingType === "Package" && (
              <Field data-invalid={!!packageNameError}>
                <FieldLabel htmlFor="pricing-package-name">
                  Package Name
                </FieldLabel>
                <Input
                  id="pricing-package-name"
                  value={packageName}
                  onChange={(event) => {
                    setPackageName(event.target.value)
                    setPackageNameError(null)
                  }}
                  placeholder="Package 1"
                  aria-invalid={!!packageNameError}
                />
                <FieldError>{packageNameError ?? undefined}</FieldError>
              </Field>
            )}

            <Field data-invalid={!!priceError}>
              <FieldLabel htmlFor="pricing-price">Price</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                  ₱
                </span>
                <Input
                  id="pricing-price"
                  className="pl-6"
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value)
                    setPriceError(null)
                  }}
                  aria-invalid={!!priceError}
                />
              </div>
              <FieldError>{priceError ?? undefined}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="pricing-unit">Unit</FieldLabel>
              <Select
                value={unit}
                onValueChange={(value) => setUnit(value as PricingUnit)}
              >
                <SelectTrigger id="pricing-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_UNITS.map((unitOption) => (
                    <SelectItem key={unitOption} value={unitOption}>
                      {unitOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="pricing-form">
            Add Pricing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
