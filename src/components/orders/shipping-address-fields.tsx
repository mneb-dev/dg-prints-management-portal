import { useRef, useState } from "react"
import { SparklesIcon, TriangleAlertIcon, TruckIcon } from "lucide-react"

import { CharCount } from "@/components/char-count"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { AddressLocationPicker } from "@/components/orders/address-location-picker"
import { ADDRESS_DETAIL_MAX, composeAddress, lookupPostal, type ShippingAddressParts } from "@/lib/ph-address"
import { autofillShipping, type AutofillResult } from "@/lib/ph-address-parse"
import { useScrollIntoViewOnOpen } from "@/lib/use-scroll-into-view-on-open"
import { cn, formatCurrency } from "@/lib/utils"

const AUTOFILL_MAX = 500

export type ShippingFieldErrors = {
  name?: string
  phone?: string
  detail?: string
  location?: string
  zip?: string
}

export function ShippingAddressFields({
  enabled,
  onEnabledChange,
  customerName,
  sameName,
  onSameNameChange,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  onPhoneBlur,
  parts,
  onPartsChange,
  legacyAddress,
  onAutofill,
  convertedFrom = null,
  onLocationPicked,
  fee,
  onFeeChange,
  freeShippingEligible = false,
  stickerLabelSubtotal = 0,
  errors,
}: {
  enabled: boolean
  onEnabledChange: (value: boolean) => void
  customerName: string
  sameName: boolean
  onSameNameChange: (value: boolean) => void
  name: string
  onNameChange: (value: string) => void
  phone: string
  onPhoneChange: (value: string) => void
  /** Lets the form check the number's format as soon as the field is left, not only on save. */
  onPhoneBlur?: () => void
  parts: ShippingAddressParts
  onPartsChange: (value: ShippingAddressParts) => void
  /**
   * The free-text address of an order saved before addresses were structured. Shown read-only until the
   * user fills in the structured fields (or Autofills from it); saving untouched keeps it as-is.
   */
  legacyAddress: string
  /** Applies a parsed paste: name/phone (when found) and the address parts. */
  onAutofill: (result: AutofillResult) => void
  /**
   * Set when a repeat customer's old one-line address was Autofilled automatically on pick: the original
   * text (shown for comparison) and whether the match needs checking.
   */
  convertedFrom?: { text: string; uncertain: boolean } | null
  /** Any pick in the location picker — even re-picking the same place — counts as the user checking it. */
  onLocationPicked?: () => void
  fee: string
  onFeeChange: (value: string) => void
  freeShippingEligible?: boolean
  stickerLabelSubtotal?: number
  errors?: ShippingFieldErrors
}) {
  // The parent (order-form.tsx) already resolves `sameName` against whether the customer name is
  // actually filled in, so the display here and the submitted payload agree.
  const hasCustomerName = !!customerName.trim()

  // Once the recipient fields slide open, bring them fully into view.
  const fieldsRef = useRef<HTMLDivElement>(null)
  useScrollIntoViewOnOpen(fieldsRef, enabled ? "open" : null)

  // The postal code last filled in from SPX's data (vs one typed by hand, which a new pick must not replace).
  const autoZip = useRef("")
  const [pasted, setPasted] = useState("")
  const [autofilling, setAutofilling] = useState(false)
  const [autofillNote, setAutofillNote] = useState<"uncertain" | "nothing" | "failed" | null>(null)

  async function runAutofill(text: string) {
    if (!text.trim() || autofilling) return
    setAutofilling(true)
    try {
      const result = await autofillShipping(text)
      const found = !!(result.phone || result.parts.city || result.parts.province || result.parts.barangay)
      if (!found) {
        setAutofillNote("nothing")
        return
      }
      onAutofill(result)
      autoZip.current = result.parts.zip // Autofill's ZIP may be SPX's; a later pick may update it
      setAutofillNote(result.uncertain ? "uncertain" : null)
    } catch {
      setAutofillNote("failed")
    } finally {
      setAutofilling(false)
    }
  }

  function updateParts(patch: Partial<ShippingAddressParts>) {
    onPartsChange({ ...parts, ...patch })
  }

  const usingLegacy = !!legacyAddress.trim() && !Object.values(parts).some((value) => value.trim())
  const complete = !!(parts.detail.trim() && parts.barangay && parts.city && parts.province)

  return (
    <div className="flex flex-col">
      {/* The whole row toggles delivery — a bigger, clearer target than the bare switch. */}
      <label
        className={cn(
          "flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-3 py-2.5 transition-colors duration-200 hover:bg-accent/40 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
          enabled && "border-primary/40 bg-accent/30"
        )}
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-sm leading-none font-medium">Deliver this order</span>
          <span className="text-xs text-muted-foreground">Add a recipient and shipping address</span>
        </span>
        <Switch checked={enabled} onCheckedChange={(checked) => onEnabledChange(!!checked)} />
      </label>

      {/* Same height + fade reveal as the line items and payment details. */}
      <Collapsible open={enabled}>
        <CollapsibleContent className="group/panel h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
          <div
            ref={fieldsRef}
            className="scroll-mb-6 pt-4 transition-[opacity,translate] duration-300 ease-out group-data-[ending-style]/panel:-translate-y-1 group-data-[ending-style]/panel:opacity-0 group-data-[starting-style]/panel:-translate-y-1 group-data-[starting-style]/panel:opacity-0 motion-reduce:transition-none"
          >
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="shipping-autofill">Paste & Autofill</FieldLabel>
                <div className="relative">
                  <Textarea
                    id="shipping-autofill"
                    value={pasted}
                    onChange={(event) => {
                      setPasted(event.target.value)
                      if (autofillNote === "nothing" || autofillNote === "failed") setAutofillNote(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault()
                        void runAutofill(pasted)
                      }
                    }}
                    placeholder="Paste the customer's name, phone and address, e.g. Juan Dela Cruz 0917 123 4567 Blk 5 Lot 12 Mabini St., Brgy. Poblacion, Morong, Bataan"
                    maxLength={AUTOFILL_MAX}
                    className="min-h-16 pb-10"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="absolute right-2 bottom-2"
                    disabled={!pasted.trim() || autofilling}
                    onClick={() => void runAutofill(pasted)}
                  >
                    {autofilling ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
                    Autofill
                  </Button>
                </div>
                {autofillNote === "nothing" && (
                  <FieldDescription>Couldn't find a phone number or place in that text.</FieldDescription>
                )}
                {autofillNote === "failed" && (
                  <FieldDescription>Couldn't load the address list. Check your connection and try again.</FieldDescription>
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className={sameName ? "opacity-70" : undefined} data-invalid={!!errors?.name}>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="shipping-name">Recipient name</FieldLabel>
                    <label className="flex items-center gap-1.5 text-xs leading-none text-muted-foreground">
                      <Switch
                        size="sm"
                        checked={sameName}
                        disabled={!hasCustomerName}
                        onCheckedChange={(checked) => onSameNameChange(!!checked)}
                      />
                      Same as customer
                    </label>
                  </div>
                  <Input
                    id="shipping-name"
                    value={sameName ? customerName : name}
                    onChange={(event) => onNameChange(event.target.value)}
                    disabled={sameName}
                    placeholder="Recipient name"
                    autoComplete="name"
                    maxLength={60}
                    aria-invalid={!!errors?.name}
                  />
                  <FieldError>{errors?.name}</FieldError>
                </Field>

                <Field data-invalid={!!errors?.phone}>
                  <FieldLabel htmlFor="shipping-phone">Recipient phone</FieldLabel>
                  <Input
                    id="shipping-phone"
                    value={phone}
                    onChange={(event) => onPhoneChange(event.target.value)}
                    onBlur={onPhoneBlur}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="09XX XXX XXXX"
                    aria-invalid={!!errors?.phone}
                  />
                  <FieldError>{errors?.phone}</FieldError>
                </Field>
              </div>

              {usingLegacy && (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Saved address (older format)</span>
                  <span className="whitespace-pre-line">{legacyAddress}</span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Kept as-is when you save. Fill in the fields below to update it.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={autofilling}
                      onClick={() => void runAutofill(legacyAddress)}
                    >
                      <SparklesIcon data-icon="inline-start" />
                      Autofill from this
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors?.location}>
                  <FieldLabel htmlFor="shipping-location">Province / City / Barangay</FieldLabel>
                  <AddressLocationPicker
                    id="shipping-location"
                    value={parts}
                    onChange={(location) => {
                      // SPX's postal code follows the town — unless someone typed their own.
                      const zipIsAuto = !parts.zip || parts.zip === autoZip.current
                      const next = { ...parts, ...location, zip: zipIsAuto && !location.city ? "" : parts.zip }
                      onPartsChange(next)
                      setAutofillNote(null)
                      onLocationPicked?.()
                      if (zipIsAuto && location.city) {
                        void lookupPostal(location.province, location.city).then((postal) => {
                          autoZip.current = postal
                          if (postal) onPartsChange({ ...next, zip: postal })
                        })
                      }
                    }}
                    invalid={!!errors?.location}
                  />
                  {(autofillNote === "uncertain" || convertedFrom?.uncertain) && !errors?.location && (
                    <p className="flex items-start gap-1.5 text-xs text-status-warning">
                      <TriangleAlertIcon aria-hidden className="mt-px size-3.5 shrink-0" />
                      Autofill couldn't match every part exactly. Check the location and detail address.
                    </p>
                  )}
                  <FieldError>{errors?.location}</FieldError>
                </Field>

                <Field data-invalid={!!errors?.detail}>
                  <div className="flex items-baseline justify-between gap-2">
                    <FieldLabel htmlFor="shipping-detail">Detail address</FieldLabel>
                    <CharCount value={parts.detail} max={ADDRESS_DETAIL_MAX} />
                  </div>
                  <Input
                    id="shipping-detail"
                    value={parts.detail}
                    onChange={(event) => updateParts({ detail: event.target.value })}
                    placeholder="House/unit no., street, subdivision"
                    autoComplete="street-address"
                    maxLength={ADDRESS_DETAIL_MAX}
                    aria-invalid={!!errors?.detail}
                  />
                  <FieldError>{errors?.detail}</FieldError>
                </Field>
              </div>

              {convertedFrom && !usingLegacy && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  <SparklesIcon aria-hidden className="mr-1 inline size-3 align-[-1px]" />
                  Filled in from their last order: <span className="text-foreground">{convertedFrom.text}</span>
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors?.zip}>
                  <FieldLabel htmlFor="shipping-zip">
                    Postal code <span className="font-normal text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Input
                    id="shipping-zip"
                    value={parts.zip}
                    onChange={(event) => updateParts({ zip: event.target.value.replace(/\D/g, "").slice(0, 4) })}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="e.g. 2108"
                    aria-invalid={!!errors?.zip}
                  />
                  <FieldError>{errors?.zip}</FieldError>
                </Field>
                {complete && (
                  <div className="flex flex-col justify-end gap-1 pb-1.5 text-sm">
                    <span className="text-xs text-muted-foreground">Full address</span>
                    <span>{composeAddress(parts)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="shipping-fee">Shipping fee</FieldLabel>
                  <CurrencyInput id="shipping-fee" value={fee} onChange={(event) => onFeeChange(event.target.value)} />
                </Field>
                {freeShippingEligible && (
                  <div className="flex items-end pb-1.5">
                    <Badge
                      variant="secondary"
                      className="h-auto animate-in gap-1.5 py-1 whitespace-normal duration-300 fade-in-0 motion-reduce:animate-none"
                    >
                      <TruckIcon aria-hidden className="size-3.5! shrink-0 text-order-status-teal" />
                      <span>
                        Free shipping — Sticker Label items total {formatCurrency(stickerLabelSubtotal)} (≥ ₱1,000)
                      </span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
