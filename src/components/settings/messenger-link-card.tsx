import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useSettings, useSettingsActions } from "@/lib/settings"

const SAVED_FLASH_MS = 2000

/** The online shop's Messenger link, used by its "Message us on Facebook" button. */
export function MessengerLinkCard() {
  const { settings, isLoading } = useSettings()
  const { updateSettings } = useSettingsActions()
  const [draft, setDraft] = useState(settings.messengerUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setDraft(settings.messengerUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.updatedAt])

  useEffect(() => {
    if (!justSaved) return
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [justSaved])

  const dirty = draft.trim() !== settings.messengerUrl

  async function handleSave() {
    if (!dirty || isSaving) return
    setIsSaving(true)
    try {
      await updateSettings({ messengerUrl: draft.trim() })
      setJustSaved(true)
      toast.success("Messenger link updated.")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update the Messenger link.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <Field>
        <FieldLabel htmlFor="settings-messenger-url">Messenger link</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="settings-messenger-url"
            type="url"
            inputMode="url"
            placeholder="https://m.me/yourpage"
            className="h-8 w-full sm:w-80"
            value={draft}
            disabled={isLoading}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSave()}
          />
          <Button size="sm" onClick={handleSave} disabled={!dirty || isSaving || isLoading}>
            {isSaving && <Spinner data-icon="inline-start" />}
            Save
          </Button>
          {dirty && !isSaving ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setDraft(settings.messengerUrl)}>
                Reset
              </Button>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden className="size-2 rounded-full bg-order-status-gold" />
                Unsaved change
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
          Where the shop's "Message us on Facebook" button goes. Paste your Facebook Page link or an m.me link; Page links are saved as m.me links so the button opens a chat. Leave empty to hide it.
        </FieldDescription>
      </Field>
    </div>
  )
}
