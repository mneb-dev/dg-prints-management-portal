import { useRef } from "react"

import { ChoiceTile } from "@/components/choice-tile"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { useEnabledOrderChannels } from "@/lib/order-channels"
import type { OrderChannel, PaymentMethod, PaymentStatus } from "@/lib/orders"
import { useEnabledPaymentMethods } from "@/lib/payment-methods"
import { useScrollIntoViewOnOpen } from "@/lib/use-scroll-into-view-on-open"
import { cn, formatCurrency } from "@/lib/utils"

import { PaymentRecap } from "./payment-recap"
import { PAYMENT_STATUS_LABELS, PaymentStatusDot } from "./payment-status-badge"

const SHOPEE_METHOD = "Bank Transfer"

/** Joined segmented track (same shape as the dashboard's period buttons). The selected segment
 * takes the soft indigo accent (like the picked channel/method tiles), an indigo hairline ring,
 * a lift and semibold text; unselected segments mute their dots, so the one colored dot left
 * standing is the selected status. Segments grow to share the width but never shrink below their
 * label (`basis-auto`, no truncation) — if the card gets too narrow the track wraps onto a second
 * row instead of clipping. */
const SEGMENT_TRACK_CLASS = "flex-wrap gap-0.5 rounded-lg border border-input bg-muted/60 p-0.5"
const SEGMENT_CLASS = cn(
  "group/seg h-8 flex-1 basis-auto gap-2 rounded-md border-0 px-3 text-muted-foreground transition-[background-color,color,box-shadow] duration-200 hover:bg-background/60 hover:text-foreground",
  "data-[pressed]:bg-accent data-[pressed]:font-semibold data-[pressed]:text-accent-foreground data-[pressed]:shadow-sm data-[pressed]:ring-1 data-[pressed]:ring-primary/40 data-[pressed]:hover:bg-accent",
  "dark:bg-transparent dark:data-[pressed]:bg-accent"
)
/** Unselected: faded dot. Selected: full color with a soft halo in the ring color. */
const SEGMENT_DOT_CLASS =
  "opacity-40 transition-[opacity,box-shadow] duration-200 group-hover/seg:opacity-70 group-data-[pressed]/seg:opacity-100 group-data-[pressed]/seg:ring-3 group-data-[pressed]/seg:ring-primary/15"

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
  allowRefunded = false,
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
  /** Offer "Refunded" — only when editing an existing order (a new order can't be refunded). */
  allowRefunded?: boolean
  errors?: { channel?: string; paymentMethod?: string; downPayment?: string }
}) {
  const { orderChannels: enabledChannels } = useEnabledOrderChannels()
  const { paymentMethods: enabledMethods } = useEnabledPaymentMethods()
  // Merge in the current value even if it's since been disabled/deleted in Settings, so
  // an existing order using a retired channel/method still renders instead of vanishing.
  const channelOptions = channel && !enabledChannels.includes(channel)
    ? [...enabledChannels, channel]
    : enabledChannels
  const paymentMethodOptions =
    paymentMethod && !enabledMethods.includes(paymentMethod) ? [...enabledMethods, paymentMethod] : enabledMethods

  const isShopee = channel === "Shopee"
  const currentStatus: PaymentStatus = markPaid ? paymentStatus : "unpaid"
  // Always offer Refunded when the loaded order already is refunded, so its state stays visible.
  const statusOptions: PaymentStatus[] = [
    "unpaid",
    "partially_paid",
    "paid",
    ...(allowRefunded || currentStatus === "refunded" ? (["refunded"] as const) : []),
  ]
  const effectiveMethod = isShopee ? SHOPEE_METHOD : paymentMethod
  const showDetails = currentStatus === "paid" || currentStatus === "partially_paid"
  // Once the details panel opens (or grows: Paid → Partial adds the down-payment field), scroll so
  // it and the recap under it are fully visible.
  const detailsRef = useRef<HTMLDivElement>(null)
  useScrollIntoViewOnOpen(detailsRef, showDetails ? currentStatus : null)

  const downPaymentNum = Number(downPayment) || 0
  const paidAmount =
    currentStatus === "paid" ? total : currentStatus === "partially_paid" ? Math.min(downPaymentNum, total) : 0
  const balance = currentStatus === "refunded" ? 0 : Math.max(total - paidAmount, 0)

  function handleSelect(status: PaymentStatus) {
    if (status === currentStatus) return

    // Leaving "paid" clears the method so re-marking as paid later asks again instead of
    // silently reusing the old one.
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

    // Paid / Partial now commit directly — method and amount are filled in inline below, and
    // the form's save validates them (validatePaymentAmount) exactly as the old dialog did.
    if (status === "partially_paid" && currentStatus !== "partially_paid") {
      onDownPaymentChange("")
    }
    onMarkPaidChange(true)
    onPaymentStatusChange(status)
  }

  return (
    <div className="flex flex-col gap-5">
      <Field data-invalid={!!errors?.channel}>
        <FieldLabel htmlFor="order-channel">Order channel</FieldLabel>
        <ToggleGroup
          id="order-channel"
          value={channel ? [channel] : []}
          onValueChange={(next) => {
            const value = next[0] as OrderChannel | undefined
            if (value) onChannelChange(value)
          }}
          className={cn(errors?.channel && "rounded-lg ring-1 ring-destructive ring-offset-2 ring-offset-card")}
        >
          {channelOptions.map((option) => (
            <ChoiceTile key={option} value={option}>
              {option}
            </ChoiceTile>
          ))}
        </ToggleGroup>
        <FieldError>{errors?.channel}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor="order-payment-status">Payment status</FieldLabel>
        <ToggleGroup
          id="order-payment-status"
          aria-label="Payment status"
          value={[currentStatus]}
          onValueChange={(next) => {
            const value = next[0] as PaymentStatus | undefined
            if (value) handleSelect(value)
          }}
          className={SEGMENT_TRACK_CLASS}
        >
          {statusOptions.map((status) => (
            <span key={status} className="contents">
              {status === "refunded" && <span aria-hidden className="mx-0.5 my-1.5 w-px shrink-0 bg-border" />}
              <Toggle value={status} className={SEGMENT_CLASS}>
                <PaymentStatusDot status={status} className={SEGMENT_DOT_CLASS} />
                <span className="leading-none whitespace-nowrap">{PAYMENT_STATUS_LABELS[status]}</span>
              </Toggle>
            </span>
          ))}
        </ToggleGroup>

        {/* Scroll target for the reveal: the details panel plus the recap under it. scroll-mb
            leaves a little breathing room below instead of parking it on the viewport edge. */}
        <div ref={detailsRef} className="flex scroll-mb-6 flex-col gap-2">
        {/* Method + amount slide open for Partial / Paid — same height/fade treatment as the
            line items' collapse, so the form moves with one motion language. */}
        <Collapsible open={showDetails}>
          <CollapsibleContent className="group/panel h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
            <div className="pt-3 transition-[opacity,translate] duration-300 ease-out group-data-[ending-style]/panel:-translate-y-1 group-data-[ending-style]/panel:opacity-0 group-data-[starting-style]/panel:-translate-y-1 group-data-[starting-style]/panel:opacity-0 motion-reduce:transition-none">
              <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-3">
                <Field data-invalid={!!errors?.paymentMethod}>
                  <FieldLabel htmlFor="order-payment-method">Method</FieldLabel>
                  <ToggleGroup
                    id="order-payment-method"
                    value={effectiveMethod ? [effectiveMethod] : []}
                    onValueChange={(next) => {
                      const value = next[0] as PaymentMethod | undefined
                      if (value) onPaymentMethodChange(value)
                    }}
                    disabled={isShopee}
                    className={cn(errors?.paymentMethod && "rounded-lg ring-1 ring-destructive ring-offset-2 ring-offset-card")}
                  >
                    {paymentMethodOptions.map((option) => (
                      <ChoiceTile
                        key={option}
                        value={option}
                        disabled={isShopee}
                        aria-invalid={!!errors?.paymentMethod || undefined}
                        className="bg-card"
                      >
                        {option}
                      </ChoiceTile>
                    ))}
                  </ToggleGroup>
                  {isShopee && (
                    <FieldDescription className="text-xs">
                      Shopee orders are always settled as a bank transfer.
                    </FieldDescription>
                  )}
                  <FieldError>{errors?.paymentMethod}</FieldError>
                </Field>

                {currentStatus === "partially_paid" && (
                  <Field data-invalid={!!errors?.downPayment}>
                    <FieldLabel htmlFor="order-payment-down-payment">Down payment</FieldLabel>
                    <CurrencyInput
                      id="order-payment-down-payment"
                      value={downPayment}
                      onChange={(event) => onDownPaymentChange(event.target.value)}
                      aria-invalid={!!errors?.downPayment}
                      className="bg-card"
                    />
                    {errors?.downPayment ? (
                      <FieldError>{errors.downPayment}</FieldError>
                    ) : (
                      <FieldDescription className="text-xs">
                        Less than the total ({formatCurrency(total)}).
                      </FieldDescription>
                    )}
                  </Field>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Live recap — what's settled and what's still to collect. */}
        <PaymentRecap total={total} paid={paidAmount} balance={balance} isRefunded={currentStatus === "refunded"} />
        </div>
      </Field>
    </div>
  )
}
