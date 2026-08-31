import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ORDER_CHANNELS, PAYMENT_METHODS } from "@/lib/orders"
import type { OrderChannel, PaymentMethod } from "@/lib/orders"
import { formatCurrency } from "@/lib/utils"

const PAYMENT_STATUS_OPTIONS = [
  { value: "paid" as const, label: "Paid" },
  { value: "partially_paid" as const, label: "Partially Paid" },
]

export function PaymentFields({
  channel,
  onChannelChange,
  markPaid,
  onMarkPaidChange,
  paymentStatus,
  onPaymentStatusChange,
  paymentMethod,
  onPaymentMethodChange,
  downPayment,
  onDownPaymentChange,
  total,
  errors,
}: {
  channel: OrderChannel | ""
  onChannelChange: (value: OrderChannel) => void
  markPaid: boolean
  onMarkPaidChange: (value: boolean) => void
  paymentStatus: "paid" | "partially_paid"
  onPaymentStatusChange: (value: "paid" | "partially_paid") => void
  paymentMethod: PaymentMethod | ""
  onPaymentMethodChange: (value: PaymentMethod) => void
  downPayment: string
  onDownPaymentChange: (value: string) => void
  total: number
  errors?: { channel?: string; paymentMethod?: string; downPayment?: string }
}) {
  const isShopee = channel === "Shopee"
  const effectiveMethod = isShopee ? "Bank Transfer" : paymentMethod
  const remainingBalance = Math.max(total - (Number(downPayment) || 0), 0)

  return (
    <div className="flex flex-col gap-3">
      <Field data-invalid={!!errors?.channel}>
        <FieldLabel htmlFor="order-channel">Order Channel</FieldLabel>
        <Select value={channel} onValueChange={(value) => onChannelChange(value as OrderChannel)}>
          <SelectTrigger id="order-channel" className="w-full" aria-invalid={!!errors?.channel}>
            <SelectValue placeholder="Select a channel" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_CHANNELS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError>{errors?.channel}</FieldError>
      </Field>

      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch checked={markPaid} onCheckedChange={(checked) => onMarkPaidChange(!!checked)} />
        Mark as paid
      </label>

      {markPaid && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <Field>
            <FieldLabel htmlFor="payment-status">Payment Status</FieldLabel>
            <Select
              value={paymentStatus}
              onValueChange={(value) => onPaymentStatusChange(value as "paid" | "partially_paid")}
            >
              <SelectTrigger id="payment-status" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    PAYMENT_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? ""
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field data-invalid={!!errors?.paymentMethod}>
            <FieldLabel htmlFor="payment-method">Payment Method</FieldLabel>
            <Select
              value={effectiveMethod}
              onValueChange={(value) => onPaymentMethodChange(value as PaymentMethod)}
              disabled={isShopee}
            >
              <SelectTrigger id="payment-method" className="w-full" aria-invalid={!!errors?.paymentMethod}>
                <SelectValue placeholder="Select a payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isShopee && (
              <p className="text-xs text-muted-foreground">
                Shopee orders are always settled as a bank transfer.
              </p>
            )}
            <FieldError>{errors?.paymentMethod}</FieldError>
          </Field>

          {paymentStatus === "partially_paid" ? (
            <>
              <Field data-invalid={!!errors?.downPayment}>
                <FieldLabel htmlFor="payment-down-payment">Down Payment</FieldLabel>
                <Input
                  id="payment-down-payment"
                  type="number"
                  min={0}
                  step="0.01"
                  value={downPayment}
                  onChange={(event) => onDownPaymentChange(event.target.value)}
                  aria-invalid={!!errors?.downPayment}
                />
                <FieldError>{errors?.downPayment}</FieldError>
              </Field>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remaining Balance</span>
                <span>{formatCurrency(remainingBalance)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Down Payment</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remaining Balance</span>
                <span>{formatCurrency(0)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
