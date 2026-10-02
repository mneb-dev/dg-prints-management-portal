import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useSettings, useSettingsActions } from "@/lib/settings"

const SAVED_FLASH_MS = 2000
/** Mirrors the server's MAX_CONVENIENCE_FEE_PERCENT. */
const MAX_PERCENT = 20

/** Returns the error to show, or null when `value` is a valid percent (0–20, up to 2 decimals). */
function validate(value: string): string | null {
  const percent = Number(value)
  if (value.trim() === "" || !Number.isFinite(percent) || percent < 0 || percent > MAX_PERCENT) {
    return `Enter a percent from 0 to ${MAX_PERCENT}.`
  }
  if (Math.round(percent * 100) !== percent * 100) return "Use at most 2 decimals."
  return null
}

/** Online shop convenience fee: baked into every shop product price to cover PayMongo's fee. */
export function ConvenienceFeeCard() {
  const { settings, isLoading } = useSettings()
  const { updateSettings } = useSettingsActions()
  const [draft, setDraft] = useState(() => String(settings.convenienceFeePercent))
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setDraft(String(settings.convenienceFeePercent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.updatedAt])

  useEffect(() => {
    if (!justSaved) return
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [justSaved])

  const error = validate(draft)
  const dirty = !error && Number(draft) !== settings.convenienceFeePercent

  async function handleSave() {
    if (!dirty || isSaving) return
    setIsSaving(true)
    try {
      await updateSettings({ convenienceFeePercent: Number(draft) })
      setJustSaved(true)
      toast.success("Convenience fee updated.")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update the convenience fee.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="settings-convenience-fee">Convenience fee</FieldLabel>
        <div className="relative w-full sm:w-36">
          <Input
            id="settings-convenience-fee"
            type="number"
            min={0}
            max={MAX_PERCENT}
            step="0.01"
            inputMode="decimal"
            className="h-8 pr-7 tabular-nums"
            value={draft}
            disabled={isLoading}
            aria-invalid={!!error}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSave()}
          />
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
            %
          </span>
        </div>
        <FieldError>{error}</FieldError>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!dirty || isSaving || isLoading}>
            {isSaving && <Spinner data-icon="inline-start" />}
            Save
          </Button>
          {(dirty || error) && !isSaving ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setDraft(String(settings.convenienceFeePercent))}>
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
          Added to every online shop product price (rounded to the nearest peso) to cover PayMongo's fee. Saved on
          each shop order as an additional fee. Shipping isn't affected. 0 turns it off.
        </FieldDescription>
      </Field>
    </div>
  )
}
