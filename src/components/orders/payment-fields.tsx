import { useEffect, useState } from "react"
import { ChevronDownIcon } from "lucide-react"

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
import { badgeVariants } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { ORDER_CHANNELS, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/orders"
import type { OrderChannel, PaymentMethod, PaymentStatus } from "@/lib/orders"
import { cn, formatCurrency } from "@/lib/utils"
import { validatePaymentAmount } from "@/lib/validation"

import {
  PAYMENT_STATUS_ICONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANTS,
} from "./payment-status-badge"

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
  paymentStatus: "paid" | "partially_paid" | "refunded"
  onPaymentStatusChange: (value: "paid" | "partially_paid" | "refunded") => void
  paymentMethod: PaymentMethod | ""
  onPaymentMethodChange: (value: PaymentMethod | "") => void
  downPayment: string
  onDownPaymentChange: (value: string) => void
  total: number
  errors?: { channel?: string; paymentMethod?: string; downPayment?: string }
}) {
  const isShopee = channel === "Shopee"
  const currentStatus: PaymentStatus = markPaid ? paymentStatus : "unpaid"
  const [targetStatus, setTargetStatus] = useState<"paid" | "partially_paid" | null>(null)
  const StatusIcon = PAYMENT_STATUS_ICONS[currentStatus]
  const paymentError = errors?.paymentMethod || errors?.downPayment
  // What's already been paid/still owed right now, before this update — passed to the dialog so
  // marking "paid" after a prior partial payment shows the real outstanding amount instead of the
  // post-save 0.
  const existingDownPayment = markPaid && paymentStatus === "partially_paid" ? Number(downPayment) || 0 : 0
  const existingBalance = Math.max(total - existingDownPayment, 0)

  function handleSelect(status: PaymentStatus) {
    if (status === currentStatus) return

    // Leaving "paid" for a status that doesn't carry the same instant-commit method
    // resolution — clear it so re-marking as paid later asks again instead of silently
    // reusing the old method.
    if (currentStatus === "paid" && status !== "paid") {
      onPaymentMethodChange("")
    }

    if (status === "unpaid") {
      onMarkPaidChange(false)
      return
    }

    if (status === "refunded") {
      onPaymentMethodChange("")
      onMarkPaidChange(true)
      onPaymentStatusChange("refunded")
      return
    }

    setTargetStatus(status)
  }

  return (
    <div className="flex flex-col gap-3">
      <Field data-invalid={!!errors?.channel}>
        <FieldLabel htmlFor="order-channel">Order Channel</FieldLabel>
        <ToggleGroup
          id="order-channel"
          value={channel ? [channel] : []}
          onValueChange={(next) => {
            const value = next[0] as OrderChannel | undefined
            if (value) onChannelChange(value)
          }}
          className={cn(errors?.channel && "rounded-lg ring-1 ring-destructive")}
        >
          {ORDER_CHANNELS.map((option) => (
            <Toggle key={option} value={option}>
              {option}
            </Toggle>
          ))}
        </ToggleGroup>
        <FieldError>{errors?.channel}</FieldError>
      </Field>

      <Field data-invalid={!!paymentError}>
        <FieldLabel>Payment Status</FieldLabel>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    badgeVariants({ variant: PAYMENT_STATUS_VARIANTS[currentStatus] }),
                    "h-8 cursor-pointer gap-1.5 px-3 text-sm transition-opacity hover:opacity-80 [&>svg]:size-4!"
                  )}
                />
              }
            >
              <StatusIcon data-icon="inline-start" />
              {PAYMENT_STATUS_LABELS[currentStatus]}
              <ChevronDownIcon className="size-4 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {PAYMENT_STATUSES.map((status) => {
                const OptionIcon = PAYMENT_STATUS_ICONS[status]
                const isCurrent = status === currentStatus
                return (
                  <DropdownMenuItem
                    key={status}
                    disabled={isCurrent}
                    onClick={() => handleSelect(status)}
                  >
                    <OptionIcon />
                    {PAYMENT_STATUS_LABELS[status]}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <FieldError>{paymentError}</FieldError>
      </Field>

      {markPaid && paymentStatus !== "refunded" && (
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Method</span>
            <span>{isShopee ? "Bank Transfer" : paymentMethod}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Down Payment</span>
            <span>
              {formatCurrency(
                paymentStatus === "partially_paid" ? Number(downPayment) || 0 : total
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Balance</span>
            <span>
              {formatCurrency(
                paymentStatus === "partially_paid"
                  ? Math.max(total - (Number(downPayment) || 0), 0)
                  : 0
              )}
            </span>
          </div>
        </div>
      )}

      <PaymentAmountDialog
        targetStatus={targetStatus}
        isShopee={isShopee}
        paymentMethod={paymentMethod}
        downPayment={downPayment}
        currentPaymentStatus={paymentStatus}
        total={total}
        existingDownPayment={existingDownPayment}
        existingBalance={existingBalance}
        onOpenChange={(open) => !open && setTargetStatus(null)}
        onConfirm={(method, downPaymentInput) => {
          if (!targetStatus) return
          onMarkPaidChange(true)
          onPaymentStatusChange(targetStatus)
          onPaymentMethodChange(method)
          if (targetStatus === "partially_paid") {
            onDownPaymentChange(downPaymentInput)
          }
          setTargetStatus(null)
        }}
      />
    </div>
  )
}

/** Collects the method (and, for `partially_paid`, the down payment) once the form's Payment
 * Status dropdown above picks a status that can't commit on its own — mirrors
 * `record-payment-dialog.tsx` (used the same way from the Orders Table/View Order page's
 * `PaymentStatusMenu`), just reporting back to the order form's local state instead of calling
 * the update API directly, since the order may not exist yet. */
function PaymentAmountDialog({
  targetStatus,
  isShopee,
  paymentMethod,
  downPayment,
  currentPaymentStatus,
  total,
  existingDownPayment,
  existingBalance,
  onOpenChange,
  onConfirm,
}: {
  targetStatus: "paid" | "partially_paid" | null
  isShopee: boolean
  paymentMethod: PaymentMethod | ""
  downPayment: string
  currentPaymentStatus: "paid" | "partially_paid" | "refunded"
  total: number
  existingDownPayment: number
  existingBalance: number
  onOpenChange: (open: boolean) => void
  onConfirm: (method: PaymentMethod, downPaymentInput: string) => void
}) {
  const [method, setMethod] = useState<PaymentMethod | "">("")
  const [downPaymentInput, setDownPaymentInput] = useState("")
  const [errors, setErrors] = useState<{ method?: string; downPayment?: string }>({})

  useEffect(() => {
    if (!targetStatus) return
    setMethod(isShopee ? "Bank Transfer" : paymentMethod)
    setDownPaymentInput(
      targetStatus === "partially_paid" && currentPaymentStatus === "partially_paid"
        ? downPayment
        : ""
    )
    setErrors({})
  }, [targetStatus, isShopee, paymentMethod, downPayment, currentPaymentStatus])

  const effectiveMethod = isShopee ? "Bank Transfer" : method
  const previewBalance = Math.max(total - (Number(downPaymentInput) || 0), 0)

  function handleSave() {
    const nextErrors = validatePaymentAmount({
      effectiveMethod,
      downPaymentInput,
      targetStatus: targetStatus === "partially_paid" ? "partially_paid" : "paid",
      total,
    })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    onConfirm(effectiveMethod as PaymentMethod, downPaymentInput)
  }

  return (
    <AlertDialog open={!!targetStatus} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Mark as {targetStatus === "paid" ? "Paid" : "Partially Paid"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {targetStatus === "partially_paid"
              ? "Needs a down payment amount and method."
              : "Needs a payment method."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          <Field data-invalid={!!errors.method}>
            <FieldLabel htmlFor="order-payment-method">Payment Method</FieldLabel>
            <ToggleGroup
              id="order-payment-method"
              value={effectiveMethod ? [effectiveMethod] : []}
              onValueChange={(next) => {
                const value = next[0] as PaymentMethod | undefined
                if (value) setMethod(value)
              }}
              disabled={isShopee}
              className={cn(
                "flex-nowrap gap-1",
                errors.method && "rounded-lg ring-1 ring-destructive"
              )}
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
              <FieldLabel htmlFor="order-payment-down-payment">Down Payment</FieldLabel>
              <Input
                id="order-payment-down-payment"
                type="number"
                min={0}
                step="0.01"
                value={downPaymentInput}
                onChange={(event) => setDownPaymentInput(event.target.value)}
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

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
