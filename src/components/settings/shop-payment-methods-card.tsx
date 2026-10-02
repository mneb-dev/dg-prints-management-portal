import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useSettings, useSettingsActions } from "@/lib/settings"

const SAVED_FLASH_MS = 2000

/** Mirrors the server's SUPPORTED_SHOP_PAYMENT_METHODS (PayMongo types the shop's checkout can take),
 *  in the order the checkout lists them. */
const OPTIONS: { type: string; label: string }[] = [
  { type: "gcash", label: "GCash" },
  { type: "paymaya", label: "Maya" },
]

/** Keeps `OPTIONS` order, so the checkout's list (and its default, the first one) is stable. */
function ordered(types: string[]): string[] {
  return OPTIONS.map((option) => option.type).filter((type) => types.includes(type))
}

/**
 * Which online payment options the shop's checkout offers (paid through PayMongo). Separate from
 * the Payment methods list above, which is what staff pick when recording payments on orders.
 */
export function ShopPaymentMethodsCard() {
  const { settings, isLoading } = useSettings()
  const { updateSettings } = useSettingsActions()
  const [draft, setDraft] = useState<string[]>(() => ordered(settings.shopPaymentMethods))
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setDraft(ordered(settings.shopPaymentMethods))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.updatedAt])

  useEffect(() => {
    if (!justSaved) return
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [justSaved])

  const saved = ordered(settings.shopPaymentMethods)
  const dirty = draft.join(",") !== saved.join(",")

  function toggle(type: string, on: boolean) {
    setDraft((current) => ordered(on ? [...current, type] : current.filter((value) => value !== type)))
  }

  async function handleSave() {
    if (!dirty || isSaving || draft.length === 0) return
    setIsSaving(true)
    try {
      await updateSettings({ shopPaymentMethods: draft })
      setJustSaved(true)
      toast.success("Online payment options updated.")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update online payment options.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <Field>
        <FieldLabel>Online payment options</FieldLabel>
        <ul className="flex flex-col divide-y rounded-lg border">
          {OPTIONS.map((option) => {
            const on = draft.includes(option.type)
            // At least one option must stay on, or paid checkouts would have nothing to pay with.
            const isLastOn = on && draft.length === 1
            return (
              <li key={option.type} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
                <label htmlFor={`shop-payment-${option.type}`} className="flex items-center gap-2 text-sm font-medium">
                  {option.label}
                  {draft[0] === option.type && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      Default
                    </span>
                  )}
                </label>
                <Switch
                  id={`shop-payment-${option.type}`}
                  checked={on}
                  disabled={isLoading || isLastOn}
                  onCheckedChange={(checked) => toggle(option.type, !!checked)}
                />
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!dirty || isSaving || isLoading}>
            {isSaving && <Spinner data-icon="inline-start" />}
            Save
          </Button>
          {dirty && !isSaving ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setDraft(saved)}>
                Reset
              </Button>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden className="size-2 rounded-full bg-order-status-gold" />
                Unsaved changes
              </span>
            </>
          ) : justSaved ? (
            <span
              role="status"
              className="flex animate-in items-center gap-1 text-xs font-medium text-order-status-teal duration-200 fade-in-0 motion-reduce:animate-none"
            >
              <CheckIcon aria-hidden className="size-3.5 stroke-3" />
              Saved
            </span>
          ) : null}
        </div>
        <FieldDescription>
          What buyers can pay with at online shop checkout (through PayMongo); the first one is preselected. Turn an
          option on only once it's activated on your PayMongo account. Separate from the payment methods staff use on
          orders.
        </FieldDescription>
      </Field>
    </div>
  )
}
