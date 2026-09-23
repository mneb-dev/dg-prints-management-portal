import { useRef } from "react"
import { TruckIcon } from "lucide-react"

import { CharCount } from "@/components/char-count"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useScrollIntoViewOnOpen } from "@/lib/use-scroll-into-view-on-open"
import { cn, formatCurrency } from "@/lib/utils"

const ADDRESS_MAX = 250

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
  address,
  onAddressChange,
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
  address: string
  onAddressChange: (value: string) => void
  fee: string
  onFeeChange: (value: string) => void
  freeShippingEligible?: boolean
  stickerLabelSubtotal?: number
  errors?: { name?: string; phone?: string; address?: string }
}) {
  // The parent (order-form.tsx) already resolves `sameName` against whether the customer name is
  // actually filled in, so the display here and the submitted payload agree.
  const hasCustomerName = !!customerName.trim()

  // Once the recipient fields slide open, bring them fully into view.
  const fieldsRef = useRef<HTMLDivElement>(null)
  useScrollIntoViewOnOpen(fieldsRef, enabled ? "open" : null)

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

              <Field data-invalid={!!errors?.address}>
                <div className="flex items-baseline justify-between gap-2">
                  <FieldLabel htmlFor="shipping-address">Address</FieldLabel>
                  <CharCount value={address} max={ADDRESS_MAX} />
                </div>
                <Textarea
                  id="shipping-address"
                  value={address}
                  onChange={(event) => onAddressChange(event.target.value)}
                  placeholder="House/unit no., street, barangay, city, province"
                  autoComplete="street-address"
                  maxLength={ADDRESS_MAX}
                  aria-invalid={!!errors?.address}
                />
                <FieldError>{errors?.address}</FieldError>
              </Field>

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
