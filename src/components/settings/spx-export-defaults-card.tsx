import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { SpxItemTypeSelect } from "@/components/orders/spx-item-type-select"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useSettings, useSettingsActions, type SpxExportDefaults, type SpxItemType } from "@/lib/settings"

const SAVED_FLASH_MS = 2000

type Draft = { weightKg: string; lengthCm: string; widthCm: string; heightCm: string; itemType: SpxItemType }

const NUMBER_FIELDS: { key: Exclude<keyof Draft, "itemType">; label: string; unit: string; max: number }[] = [
  { key: "weightKg", label: "Weight", unit: "kg", max: 50 },
  { key: "lengthCm", label: "Length", unit: "cm", max: 150 },
  { key: "widthCm", label: "Width", unit: "cm", max: 150 },
  { key: "heightCm", label: "Height", unit: "cm", max: 150 },
]

function toDraft(defaults: SpxExportDefaults): Draft {
  return {
    weightKg: String(defaults.weightKg),
    lengthCm: String(defaults.lengthCm),
    widthCm: String(defaults.widthCm),
    heightCm: String(defaults.heightCm),
    itemType: defaults.itemType,
  }
}

/** Parcel details the "Export to SPX" file starts every order with (staff can change rows there). */
export function SpxExportDefaultsCard() {
  const { settings, isLoading } = useSettings()
  const { updateSettings } = useSettingsActions()
  const saved = settings.spxExportDefaults
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved))
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setDraft(toDraft(settings.spxExportDefaults))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.updatedAt])

  useEffect(() => {
    if (!justSaved) return
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [justSaved])

  const invalid = NUMBER_FIELDS.find(({ key, max }) => {
    const n = Number(draft[key])
    return !draft[key].trim() || !Number.isFinite(n) || n <= 0 || n > max
  })
  const dirty =
    draft.itemType !== saved.itemType || NUMBER_FIELDS.some(({ key }) => Number(draft[key]) !== saved[key])

  async function handleSave() {
    if (!dirty || invalid || isSaving) return
    setIsSaving(true)
    try {
      await updateSettings({
        spxExportDefaults: {
          weightKg: Number(draft.weightKg),
          lengthCm: Number(draft.lengthCm),
          widthCm: Number(draft.widthCm),
          heightCm: Number(draft.heightCm),
          itemType: draft.itemType,
        },
      })
      setJustSaved(true)
      toast.success("SPX export defaults updated.")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update the SPX export defaults.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <Field>
        <FieldLabel>SPX export defaults</FieldLabel>
        <FieldDescription>
          Every order in an "Export to SPX" file starts with this parcel size and item type. You can change single
          orders before downloading.
        </FieldDescription>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NUMBER_FIELDS.map(({ key, label, unit, max }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label htmlFor={`settings-spx-${key}`} className="text-xs font-medium text-muted-foreground">
                {label} ({unit})
              </label>
              <Input
                id={`settings-spx-${key}`}
                inputMode="decimal"
                value={draft[key]}
                disabled={isLoading}
                aria-invalid={invalid?.key === key}
                onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value.replace(/[^\d.]/g, "") }))}
                onKeyDown={(event) => event.key === "Enter" && handleSave()}
                title={`More than 0, at most ${max}`}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 sm:max-w-64">
          <span className="text-xs font-medium text-muted-foreground">Item type</span>
          <SpxItemTypeSelect
            value={draft.itemType}
            onChange={(itemType) => setDraft((prev) => ({ ...prev, itemType }))}
            disabled={isLoading}
          />
        </div>
        {invalid && (
          <p className="text-xs text-destructive">
            {invalid.label} must be more than 0 and at most {invalid.max} {invalid.unit} (SPX's limit).
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!dirty || !!invalid || isSaving || isLoading}>
            {isSaving && <Spinner data-icon="inline-start" />}
            Save
          </Button>
          {dirty && !isSaving ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setDraft(toDraft(saved))}>
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
      </Field>
    </div>
  )
}
