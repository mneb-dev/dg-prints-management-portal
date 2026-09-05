import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { PAYMENT_METHODS } from "@/lib/orders"
import type { Order, Payment, PaymentMethod } from "@/lib/orders"
import { cn, formatCurrency } from "@/lib/utils"

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
  const isShopee = order?.channel === "Shopee"
  const [method, setMethod] = useState<PaymentMethod | "">("")
  const [downPayment, setDownPayment] = useState("")
  const [errors, setErrors] = useState<{ method?: string; downPayment?: string }>({})

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

  function handleConfirm(target: Order, status: "paid" | "partially_paid") {
    const nextErrors: { method?: string; downPayment?: string } = {}
    if (!effectiveMethod) nextErrors.method = "Select a payment method."
    if (status === "partially_paid") {
      const value = Number(downPayment)
      if (!Number.isFinite(value) || value <= 0 || value >= target.total) {
        nextErrors.downPayment = "Must be greater than 0 and less than the total."
      }
    }
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
    <AlertDialog open={!!order && !!targetStatus} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Mark as {targetStatus === "paid" ? "Paid" : "Partially Paid"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Order <span className="font-medium text-foreground">{order?.orderNumber}</span>
            {targetStatus === "partially_paid"
              ? " needs a down payment amount and method."
              : " needs a payment method."}
          </AlertDialogDescription>
        </AlertDialogHeader>

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
              className={cn("flex-nowrap gap-1", errors.method && "rounded-lg ring-1 ring-destructive")}
            >
              {PAYMENT_METHODS.map((option) => (
                <Toggle
                  key={option}
                  value={option}
                  disabled={isShopee}
                  className="h-7 px-1.5 text-xs"
                >
                  {option}
                </Toggle>
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
              <Input
                id="record-payment-amount"
                type="number"
                min={0}
                step="0.01"
                value={downPayment}
                onChange={(event) => setDownPayment(event.target.value)}
                aria-invalid={!!errors.downPayment}
              />
              <FieldError>{errors.downPayment}</FieldError>
            </Field>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Remaining Balance</span>
            <span>{formatCurrency(previewBalance)}</span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => order && targetStatus && handleConfirm(order, targetStatus)}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving..." : "Save"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
