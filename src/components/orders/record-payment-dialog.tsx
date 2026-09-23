import { WalletIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { ChoiceTile } from "@/components/choice-tile"
import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ToggleGroup } from "@/components/ui/toggle-group"
import type { Order, Payment, PaymentMethod } from "@/lib/orders"
import { useEnabledPaymentMethods } from "@/lib/payment-methods"
import { cn, formatCurrency } from "@/lib/utils"
import { validatePaymentAmount } from "@/lib/validation"

/** Small form dialog for the payment states that can't commit from a single dropdown click:
 * `partially_paid` always needs a down-payment amount, and `paid` needs a method whenever one
 * isn't already on file. Mirrors the validation/formula in `payment-fields.tsx`
 * (`order-form.tsx`), just scoped to one order instead of the whole edit form. Keeps rendering
 * (rather than unmounting) while `order` is null so the close animation still plays, matching
 * `cancel-order-dialog.tsx`/`refund-order-dialog.tsx`. */
export function RecordPaymentDialog({
  order,
  targetStatus,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  order: Order | null
  targetStatus: "paid" | "partially_paid" | null
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (order: Order, payment: Payment) => void
}) {
  const { paymentMethods: enabledMethods } = useEnabledPaymentMethods()
  const isShopee = order?.channel === "Shopee"
  const [method, setMethod] = useState<PaymentMethod | "">("")
  const [downPayment, setDownPayment] = useState("")
  const [errors, setErrors] = useState<{ method?: string; downPayment?: string }>({})

  // Merge in the order's existing method even if it's since been disabled/deleted in
  // Settings, so it still renders instead of vanishing from the toggle group.
  const existingMethod = order?.payment.method
  const paymentMethodOptions =
    existingMethod && !enabledMethods.includes(existingMethod)
      ? [...enabledMethods, existingMethod]
      : enabledMethods

  useEffect(() => {
    if (!order) return
    // Leaving "paid" for "partially_paid" shouldn't carry the old method over — ask again
    // instead of silently reusing it (matches the "unpaid" transition, which already resets
    // the method server-side).
    const leavingPaid = order.payment.status === "paid" && targetStatus !== "paid"
    setMethod(isShopee ? "Bank Transfer" : leavingPaid ? "" : (order.payment.method ?? ""))
    setDownPayment(
      targetStatus === "partially_paid" && order.payment.status === "partially_paid"
        ? String(order.payment.downPayment)
        : ""
    )
    setErrors({})
  }, [order, targetStatus, isShopee])

  const total = order?.total ?? 0
  const effectiveMethod = isShopee ? "Bank Transfer" : method
  const previewDownPayment = targetStatus === "partially_paid" ? Number(downPayment) || 0 : total
  const previewBalance = Math.max(total - previewDownPayment, 0)
  // What's actually already paid/still owed right now, before this update — shown instead of
  // the post-save preview above when marking "paid", so a prior partial payment (e.g. 100 of
  // 200) doesn't get hidden behind a misleading "Remaining Balance: 0".
  const existingDownPayment = order?.payment.downPayment ?? 0
  const existingBalance = order?.payment.balance ?? 0

  function handleConfirm(target: Order, status: "paid" | "partially_paid") {
    const nextErrors = validatePaymentAmount({
      effectiveMethod,
      downPaymentInput: downPayment,
      targetStatus: status,
      total: target.total,
    })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    onConfirm(target, {
      status,
      method: effectiveMethod as PaymentMethod,
      downPayment: previewDownPayment,
      balance: previewBalance,
    })
  }

  return (
    <ConfirmDialog
      open={!!order && !!targetStatus}
      onOpenChange={onOpenChange}
      tone="primary"
      icon={WalletIcon}
      title={
        <>
          Mark <Name>{order?.orderNumber}</Name> as {targetStatus === "paid" ? "paid" : "partially paid"}?
        </>
      }
      description={
        targetStatus === "partially_paid" ? "Add the down payment and how it was paid." : "Pick how it was paid."
      }
      confirmLabel="Yes, save payment"
      pendingLabel="Saving…"
      cancelLabel="No, go back"
      isPending={isPending}
      onConfirm={() => order && targetStatus && handleConfirm(order, targetStatus)}
    >
        <div className="flex flex-col gap-3">
          <Field data-invalid={!!errors.method}>
            <FieldLabel htmlFor="record-payment-method">Payment Method</FieldLabel>
            <ToggleGroup
              id="record-payment-method"
              value={effectiveMethod ? [effectiveMethod] : []}
              onValueChange={(next) => {
                const value = next[0] as PaymentMethod | undefined
                if (value) setMethod(value)
              }}
              disabled={isShopee}
              className={cn(errors.method && "rounded-lg ring-1 ring-destructive ring-offset-2 ring-offset-popover")}
            >
              {paymentMethodOptions.map((option) => (
                <ChoiceTile key={option} value={option} disabled={isShopee}>
                  {option}
                </ChoiceTile>
              ))}
            </ToggleGroup>
            {isShopee && (
              <p className="text-xs text-muted-foreground">
                Shopee orders are always settled as a bank transfer.
              </p>
            )}
            <FieldError>{errors.method}</FieldError>
          </Field>

          {targetStatus === "partially_paid" && (
            <Field data-invalid={!!errors.downPayment}>
              <FieldLabel htmlFor="record-payment-amount">Down Payment</FieldLabel>
              <CurrencyInput
                id="record-payment-amount"
                value={downPayment}
                onChange={(event) => setDownPayment(event.target.value)}
                aria-invalid={!!errors.downPayment}
              />
              <FieldError>{errors.downPayment}</FieldError>
            </Field>
          )}

          {targetStatus === "paid" && existingDownPayment > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Down Payment</span>
              <span>{formatCurrency(existingDownPayment)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {targetStatus === "paid" ? "Amount Due" : "Remaining Balance"}
            </span>
            <span>
              {formatCurrency(targetStatus === "paid" ? existingBalance : previewBalance)}
            </span>
          </div>
        </div>

    </ConfirmDialog>
  )
}
