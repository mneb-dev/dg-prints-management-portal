import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useSettings, useSettingsActions, type ShippingRates } from "@/lib/settings"

const SAVED_FLASH_MS = 2000

const REGIONS: { key: keyof ShippingRates; label: string }[] = [
  { key: "luzon", label: "Luzon" },
  { key: "visayas", label: "Visayas" },
  { key: "mindanao", label: "Mindanao" },
]

type Draft = Record<keyof ShippingRates, string>

function toDraft(rates: ShippingRates): Draft {
  return { luzon: String(rates.luzon), visayas: String(rates.visayas), mindanao: String(rates.mindanao) }
}

function fromDraft(draft: Draft): ShippingRates {
  const parse = (value: string) => Math.max(0, Number(value) || 0)
  return { luzon: parse(draft.luzon), visayas: parse(draft.visayas), mindanao: parse(draft.mindanao) }
}

/** Online shop checkout fees per island group; the buyer's province picks which one applies. */
export function ShippingRatesCard() {
  const { settings, isLoading } = useSettings()
  const { updateSettings } = useSettingsActions()
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings.shippingRates))
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setDraft(toDraft(settings.shippingRates))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.updatedAt])

  useEffect(() => {
    if (!justSaved) return
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [justSaved])

  const next = fromDraft(draft)
  const dirty = REGIONS.some(({ key }) => next[key] !== settings.shippingRates[key])

  async function handleSave() {
    if (!dirty || isSaving) return
    setIsSaving(true)
    try {
      await updateSettings({ shippingRates: next })
      setJustSaved(true)
      toast.success("Shipping fees updated.")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update shipping fees.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <Field>
        <FieldLabel>Shipping fees</FieldLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {REGIONS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label htmlFor={`settings-shipping-${key}`} className="text-xs font-medium text-muted-foreground">
                {label}
              </label>
              <CurrencyInput
                id={`settings-shipping-${key}`}
                wrapperClassName="w-full sm:w-36"
                className="h-8 tabular-nums"
                value={draft[key]}
                disabled={isLoading}
                onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                onKeyDown={(event) => event.key === "Enter" && handleSave()}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!dirty || isSaving || isLoading}>
            {isSaving && <Spinner data-icon="inline-start" />}
            Save
          </Button>
          {dirty && !isSaving ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setDraft(toDraft(settings.shippingRates))}>
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
          Charged at online shop checkout, based on the buyer's province. The order form's shipping fee above is separate.
        </FieldDescription>
      </Field>
    </div>
  )
}
