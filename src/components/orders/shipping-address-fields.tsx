import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

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
  error,
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
  error?: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch checked={enabled} onCheckedChange={(checked) => onEnabledChange(!!checked)} />
        Add shipping address
      </label>

      {enabled && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="shipping-name">Name</FieldLabel>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch
                  size="sm"
                  checked={sameName}
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
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="shipping-phone">Phone</FieldLabel>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch
                  size="sm"
                  checked={samePhone}
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
              placeholder="0917 000 0000"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="shipping-address">Address</FieldLabel>
            <Textarea
              id="shipping-address"
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="House/unit no., street, barangay, city, province"
              maxLength={250}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="shipping-fee">Shipping Fee</FieldLabel>
            <Input
              id="shipping-fee"
              type="number"
              min={0}
              step="0.01"
              value={fee}
              onChange={(event) => onFeeChange(event.target.value)}
            />
          </Field>

          <FieldError>{error}</FieldError>
        </div>
      )}
    </div>
  )
}
