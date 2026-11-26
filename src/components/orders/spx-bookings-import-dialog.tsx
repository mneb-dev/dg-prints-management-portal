import { useRef, useState } from "react"
import { FileUpIcon, ScanBarcodeIcon } from "lucide-react"
import { toast } from "sonner"

import { FormDialogHeader } from "@/components/form-dialog-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-error"
import { importSpxBookings, type SpxBookingResult } from "@/lib/spx-bookings-api"
import { parseSpxReport, type SpxReportRow } from "@/lib/spx-tracking-import"
import { cn } from "@/lib/utils"

const MAX_ROWS = 500

type Entry = { row: SpxReportRow; result: SpxBookingResult | null }

function describe(entry: Entry): { label: string; tone: "ok" | "muted" } {
  if (!entry.row.orderNumber) return { label: "No order number", tone: "muted" }
  switch (entry.result?.status) {
    case "will_arrange":
      return { label: "Will mark arranged", tone: "ok" }
    case "already_arranged":
      return { label: "Already arranged", tone: "muted" }
    case "not_found":
      return { label: "No such order", tone: "muted" }
    case "duplicate":
      return { label: "Listed twice", tone: "muted" }
    default:
      return { label: "Can't be used", tone: "muted" }
  }
}

/**
 * "Import SPX bookings": reads SPX's order report and marks the orders named in its Customer Reference No.
 * (set by Export to SPX) as arranged. Nothing else is saved — SPX tracks parcels by that order number too.
 * A dry run shows what will change first. Mounted only while open.
 */
export function SpxBookingsImportDialog({
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
        ? await importSpxBookings(
            withNumber.map((row) => row.orderNumber!),
            true
          )
        : []
      let next = 0
      const built = rows.map((row) => ({ row, result: row.orderNumber ? (results[next++] ?? null) : null }))
      setEntries(built)
      setSelected(new Set(built.flatMap((entry, index) => (entry.result?.status === "will_arrange" ? [index] : []))))
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
      const results = await importSpxBookings(
        [...selected].map((index) => entries[index].row.orderNumber!),
        false
      )
      const marked = results.filter((result) => result.status === "arranged").length
      toast.success(`${marked} ${marked === 1 ? "order" : "orders"} marked as arranged.`)
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
          title={<>Import SPX bookings</>}
          description={
            <>
              Upload the order report downloaded from SPX. Orders named in its Customer Reference No. are marked
              arranged, and can then be tracked in SPX by their order number.
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
                  directly in SPX, so {missingNumber === 1 ? "it can't" : "they can't"} be matched. Mark{" "}
                  {missingNumber === 1 ? "that order" : "those orders"} arranged by hand.
                </p>
              )}
              <ul className="flex flex-col divide-y rounded-lg border">
                {entries.map((entry, index) => {
                  const selectable = entry.result?.status === "will_arrange"
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
                          checked={selected.has(index)}
                          disabled={!selectable}
                          onChange={(event) => toggle(index, event.target.checked)}
                          aria-label={`Mark ${entry.row.orderNumber ?? entry.row.trackingNumber} arranged`}
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium">{entry.row.orderNumber ?? "—"}</span>
                            <span className="min-w-0 truncate text-muted-foreground">
                              {entry.result?.customerName || entry.row.recipientName}
                            </span>
                          </span>
                          {/* SPX's own number, only to help recognise the parcel — not saved. */}
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            {entry.row.trackingNumber}
                          </span>
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-auto max-w-[45%] shrink-0 py-0.5 text-right whitespace-normal",
                            tone === "ok" && "bg-status-success/15 text-status-success"
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
              Mark {selected.size} arranged
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
