import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"

export function ShippingAddressFields({
  enabled,
  onEnabledChange,
  customerName,
  customerPhone,
  sameName,
  onSameNameChange,
  samePhone,
  onSamePhoneChange,
  name,
  onNameChange,
  phone,
  onPhoneChange,
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
  customerPhone: string
  sameName: boolean
  onSameNameChange: (value: boolean) => void
  samePhone: boolean
  onSamePhoneChange: (value: boolean) => void
  name: string
  onNameChange: (value: string) => void
  phone: string
  onPhoneChange: (value: string) => void
  address: string
  onAddressChange: (value: string) => void
  fee: string
  onFeeChange: (value: string) => void
  freeShippingEligible?: boolean
  stickerLabelSubtotal?: number
  errors?: { name?: string; phone?: string; address?: string }
}) {
  // The parent (order-form.tsx) already resolves `sameName`/`samePhone` against whether the
  // customer fields are actually filled in, so the display here and the submitted payload agree.
  const hasCustomerName = !!customerName.trim()
  const hasCustomerPhone = !!customerPhone.trim()

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch checked={enabled} onCheckedChange={(checked) => onEnabledChange(!!checked)} />
        Add shipping address
      </label>

      {enabled && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <Field className={sameName ? "opacity-70" : undefined} data-invalid={!!errors?.name}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="shipping-name">Name</FieldLabel>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
              maxLength={60}
              aria-invalid={!!errors?.name}
            />
            <FieldError>{errors?.name}</FieldError>
          </Field>

          <Field className={samePhone ? "opacity-70" : undefined} data-invalid={!!errors?.phone}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="shipping-phone">Phone</FieldLabel>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch
                  size="sm"
                  checked={samePhone}
                  disabled={!hasCustomerPhone}
                  onCheckedChange={(checked) => onSamePhoneChange(!!checked)}
                />
                Same as customer
              </label>
            </div>
            <Input
              id="shipping-phone"
              value={samePhone ? customerPhone : phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              disabled={samePhone}
              placeholder="09XX XXX XXXX"
              aria-invalid={!!errors?.phone}
            />
            <FieldError>{errors?.phone}</FieldError>
          </Field>

          <Field data-invalid={!!errors?.address}>
            <FieldLabel htmlFor="shipping-address">Address</FieldLabel>
            <Textarea
              id="shipping-address"
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="House/unit no., street, barangay, city, province"
              maxLength={250}
              aria-invalid={!!errors?.address}
            />
            <FieldError>{errors?.address}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="shipping-fee">Shipping Fee</FieldLabel>
            <CurrencyInput
              id="shipping-fee"
              value={fee}
              onChange={(event) => onFeeChange(event.target.value)}
            />
            {freeShippingEligible && (
              <FieldDescription>
                Free shipping — Sticker Label items total {formatCurrency(stickerLabelSubtotal)} (≥ ₱1,000).
              </FieldDescription>
            )}
          </Field>
        </div>
      )}
    </div>
  )
}
