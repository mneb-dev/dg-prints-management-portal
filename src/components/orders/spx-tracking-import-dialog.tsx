import { useRef, useState } from "react"
import { FileUpIcon, ScanBarcodeIcon } from "lucide-react"
import { toast } from "sonner"

import { FormDialogHeader } from "@/components/form-dialog-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-error"
import { importTrackingNumbers, type TrackingImportResult } from "@/lib/spx-tracking-api"
import { parseSpxReport, type SpxReportRow } from "@/lib/spx-tracking-import"
import { cn } from "@/lib/utils"

const MAX_ROWS = 500

type Entry = { row: SpxReportRow; result: TrackingImportResult | null }

const isSelectable = (entry: Entry) =>
  entry.result?.status === "will_set" || entry.result?.status === "will_replace"

function describe(entry: Entry): { label: string; tone: "ok" | "warn" | "muted" } {
  const result = entry.result
  if (!entry.row.orderNumber) return { label: "No order number", tone: "muted" }
  switch (result?.status) {
    case "will_set":
      return { label: "Will add", tone: "ok" }
    case "will_replace":
      return { label: `Replaces ${result.previousTrackingNumber ?? ""}`.trim(), tone: "warn" }
    case "unchanged":
      return { label: "Already saved", tone: "muted" }
    case "not_found":
      return { label: "No such order", tone: "muted" }
    case "duplicate":
      return { label: "Listed twice — the later row is used", tone: "muted" }
    case "invalid":
      return { label: result.error ?? "Can't be used", tone: "muted" }
    default:
      return { label: "—", tone: "muted" }
  }
}

/**
 * "Import SPX tracking": reads SPX's order report and saves each parcel's tracking number on the order named
 * in its Customer Reference No. (set by Export to SPX). A dry run shows what will change before saving;
 * saving a tracking number also marks the order arranged. Mounted only while open.
 */
export function SpxTrackingImportDialog({
  onOpenChange,
  onImported,
}: {
  onOpenChange: (open: boolean) => void
  /** Called after orders were updated (to refresh the list). */
  onImported: () => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  async function handleFile(file: File) {
    setFileName(file.name)
    setEntries(null)
    setError(null)
    setIsReading(true)
    try {
      const rows = parseSpxReport(new Uint8Array(await file.arrayBuffer()))
      if (rows.length === 0) throw new Error("The report has no parcels.")
      const withNumber = rows.filter((row) => row.orderNumber)
      if (withNumber.length > MAX_ROWS) throw new Error(`At most ${MAX_ROWS} parcels per import — split the report.`)
      const results = withNumber.length
        ? await importTrackingNumbers(
            withNumber.map((row) => ({ orderNumber: row.orderNumber!, trackingNumber: row.trackingNumber })),
            true
          )
        : []
      let next = 0
      const built = rows.map((row) => ({ row, result: row.orderNumber ? (results[next++] ?? null) : null }))
      setEntries(built)
      // New numbers are picked by default; replacing an existing number is an explicit choice.
      setSelected(new Set(built.flatMap((entry, index) => (entry.result?.status === "will_set" ? [index] : []))))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsReading(false)
    }
  }

  function toggle(index: number, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(index)
      else next.delete(index)
      return next
    })
  }

  async function handleApply() {
    if (!entries || selected.size === 0 || isApplying) return
    setIsApplying(true)
    try {
      const rows = [...selected].map((index) => ({
        orderNumber: entries[index].row.orderNumber!,
        trackingNumber: entries[index].row.trackingNumber,
      }))
      const results = await importTrackingNumbers(rows, false)
      const saved = results.filter((result) => result.status === "updated" || result.status === "replaced").length
      toast.success(`Tracking numbers saved on ${saved} ${saved === 1 ? "order" : "orders"}.`)
      onImported()
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsApplying(false)
    }
  }

  const missingNumber = entries?.filter((entry) => !entry.row.orderNumber).length ?? 0

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <FormDialogHeader
          icon={ScanBarcodeIcon}
          title={<>Import SPX tracking</>}
          description={
            <>
              Upload the order report downloaded from SPX. Each parcel's tracking number is saved on the order in
              its Customer Reference No., and the order is marked arranged.
            </>
          }
        />

        <DialogBody className="min-h-40">
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) void handleFile(file)
            }}
          />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={isReading || isApplying}>
              <FileUpIcon data-icon="inline-start" />
              {fileName ? "Choose another file" : "Choose SPX report (.xlsx)"}
            </Button>
            {fileName && <span className="min-w-0 truncate text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {isReading ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : entries ? (
            <div className="flex flex-col gap-2 pb-1">
              {missingNumber > 0 && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {missingNumber} {missingNumber === 1 ? "parcel has" : "parcels have"} no order number — booked
                  directly in SPX. Add {missingNumber === 1 ? "its tracking number" : "their tracking numbers"} on the
                  order instead.
                </p>
              )}
              <ul className="flex flex-col divide-y rounded-lg border">
                {entries.map((entry, index) => {
                  const selectable = isSelectable(entry)
                  const isOn = selected.has(index)
                  const { label, tone } = describe(entry)
                  return (
                    <li key={`${entry.row.trackingNumber}-${index}`}>
                      <label
                        className={cn(
                          "flex items-start gap-2.5 px-3 py-2 text-sm",
                          selectable ? "cursor-pointer" : "opacity-60"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                          checked={isOn}
                          disabled={!selectable}
                          onChange={(event) => toggle(index, event.target.checked)}
                          aria-label={`Save ${entry.row.trackingNumber}`}
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium">{entry.row.orderNumber ?? "—"}</span>
                            <span className="min-w-0 truncate text-muted-foreground">
                              {entry.result?.customerName || entry.row.recipientName}
                            </span>
                          </span>
                          <span className="font-mono text-xs tabular-nums">{entry.row.trackingNumber}</span>
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-auto max-w-[45%] shrink-0 py-0.5 text-right whitespace-normal",
                            tone === "ok" && "bg-status-success/15 text-status-success",
                            tone === "warn" && "bg-status-warning/15 text-status-warning"
                          )}
                        >
                          {label}
                        </Badge>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              In SPX, download the order list as Excel, then choose that file here.
            </p>
          )}
        </DialogBody>

        {entries && entries.length > 0 && (
          <DialogFooter className="items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              {selected.size} of {entries.length} selected
            </span>
            <Button onClick={handleApply} disabled={selected.size === 0 || isApplying}>
              {isApplying && <Spinner data-icon="inline-start" />}
              Update {selected.size} {selected.size === 1 ? "order" : "orders"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
