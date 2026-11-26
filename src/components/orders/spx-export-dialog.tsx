import { useEffect, useState } from "react"
import { CircleCheckIcon, DownloadIcon, ExternalLinkIcon, FileSpreadsheetIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { FormDialogHeader } from "@/components/form-dialog-header"
import { SpxItemTypeSelect } from "@/components/orders/spx-item-type-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-error"
import { SPX_ADMIN_CREATE_ORDER_URL } from "@/lib/clipboard"
import { formatLocation } from "@/lib/ph-address"
import { useSettings } from "@/lib/settings"
import {
  downloadSpxFile,
  loadExportableOrders,
  rowFromOrder,
  rowProblems,
  type SpxExportRow,
  type SpxPayer,
} from "@/lib/spx-export"
import { cn, formatCurrency } from "@/lib/utils"

const SIZE_FIELDS: { key: "weightKg" | "lengthCm" | "widthCm" | "heightCm"; label: string; unit: string }[] = [
  { key: "weightKg", label: "Weight", unit: "kg" },
  { key: "lengthCm", label: "Length", unit: "cm" },
  { key: "widthCm", label: "Width", unit: "cm" },
  { key: "heightCm", label: "Height", unit: "cm" },
]

/**
 * "Export to SPX": every paid, not-yet-arranged order with a delivery address, prefilled with the
 * Settings → Shipping parcel defaults, editable per order, downloaded as SPX's own mass order template.
 * Mounted only while open, so each opening reloads the orders.
 */
export function SpxExportDialog({
  onOpenChange,
  onArrange,
}: {
  onOpenChange: (open: boolean) => void
  /** Marks the exported orders as arranged (after the file is downloaded). */
  onArrange: (orderIds: string[]) => Promise<void>
}) {
  const { settings, isLoading: settingsLoading } = useSettings()
  const [rows, setRows] = useState<SpxExportRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState<{ fileName: string; orderIds: string[] } | null>(null)
  const [isArranging, setIsArranging] = useState(false)

  useEffect(() => {
    if (settingsLoading) return
    let active = true
    ;(async () => {
      try {
        const orders = await loadExportableOrders()
        const built = await Promise.all(orders.map((order) => rowFromOrder(order, settings.spxExportDefaults)))
        if (!active) return
        setRows(built)
        setSelected(new Set(built.map((row) => row.orderId)))
      } catch (err) {
        if (active) setLoadError(getErrorMessage(err))
      }
    })()
    return () => {
      active = false
    }
    // Load once the defaults are known; later Settings changes don't reset rows being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading])

  function updateRow(orderId: string, patch: Partial<SpxExportRow>) {
    setRows((prev) => prev?.map((row) => (row.orderId === orderId ? { ...row, ...patch } : row)) ?? prev)
  }

  function toggle(orderId: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(orderId)
      else next.delete(orderId)
      return next
    })
  }

  const chosen = rows?.filter((row) => selected.has(row.orderId)) ?? []
  const withProblems = chosen.filter((row) => rowProblems(row).length > 0)
  const allSelected = !!rows?.length && chosen.length === rows.length

  async function handleDownload() {
    if (!chosen.length || withProblems.length || isDownloading) return
    setIsDownloading(true)
    try {
      const fileName = await downloadSpxFile(chosen)
      setDownloaded({ fileName, orderIds: chosen.map((row) => row.orderId) })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleArrange() {
    if (!downloaded || isArranging) return
    setIsArranging(true)
    try {
      await onArrange(downloaded.orderIds)
      toast.success(`${downloaded.orderIds.length} ${downloaded.orderIds.length === 1 ? "order" : "orders"} marked as arranged.`)
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsArranging(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <FormDialogHeader
          icon={FileSpreadsheetIcon}
          title={<>Export to SPX</>}
          description={
            <>
              Orders in "To Pack" that are paid, have a delivery address and aren't marked arranged yet. Download the
              file, then upload it in SPX's mass order creation.
            </>
          }
        />

        <DialogBody className="min-h-48">
          {downloaded && (
            <div className="mb-3 flex flex-col gap-2 rounded-lg bg-status-success/10 px-3 py-2.5 text-sm">
              <span className="flex items-start gap-2">
                <CircleCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-status-success" />
                <span>
                  Saved <span className="font-medium">{downloaded.fileName}</span> with {downloaded.orderIds.length}{" "}
                  {downloaded.orderIds.length === 1 ? "order" : "orders"}. Upload it in SPX, then mark them arranged
                  here.
                </span>
              </span>
              <div className="flex flex-wrap gap-2 pl-6">
                <Button size="sm" variant="outline" onClick={() => window.open(SPX_ADMIN_CREATE_ORDER_URL, "_blank", "noopener,noreferrer")}>
                  <ExternalLinkIcon data-icon="inline-start" />
                  Open SPX
                </Button>
                <Button size="sm" onClick={handleArrange} disabled={isArranging}>
                  {isArranging && <Spinner data-icon="inline-start" />}
                  Mark {downloaded.orderIds.length} as arranged
                </Button>
              </div>
            </div>
          )}

          {loadError ? (
            <p className="py-12 text-center text-sm text-destructive">{loadError}</p>
          ) : !rows ? (
            <div className="flex justify-center py-12">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nothing to export. Orders show up here once they're in "To Pack", paid, have a delivery address and
              aren't marked arranged.
            </p>
          ) : (
            <div className="flex flex-col gap-2 pb-1">
              <label className="flex items-center gap-2 px-1 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={allSelected}
                  onChange={(event) =>
                    setSelected(event.target.checked ? new Set(rows.map((row) => row.orderId)) : new Set())
                  }
                />
                Select all ({rows.length})
              </label>
              <ul className="flex flex-col gap-2">
                {rows.map((row) => {
                  const isOn = selected.has(row.orderId)
                  const problems = isOn ? rowProblems(row) : []
                  return (
                    <li
                      key={row.orderId}
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-3 transition-opacity",
                        !isOn && "opacity-60",
                        problems.length > 0 && "border-destructive/50"
                      )}
                    >
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                          checked={isOn}
                          onChange={(event) => toggle(row.orderId, event.target.checked)}
                          aria-label={`Include ${row.orderNumber}`}
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium">{row.orderNumber}</span>
                            <span>{row.recipientName}</span>
                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                              Value {formatCurrency(row.parcelValue)}
                            </span>
                          </span>
                          {row.freeTextAddress ? (
                            <span className="flex items-start gap-1 text-xs text-status-warning">
                              <TriangleAlertIcon aria-hidden className="mt-px size-3.5 shrink-0" />
                              Older address — exported as text only: {row.detailedAddress}
                            </span>
                          ) : (
                            <span className="truncate text-xs text-muted-foreground">
                              {formatLocation({ province: row.province, city: row.town, barangay: row.barangay }, row.region)}
                              {row.postalCode && ` · ${row.postalCode}`}
                            </span>
                          )}
                        </span>
                      </label>

                      {isOn && (
                        <div className="flex flex-col gap-2 sm:pl-6">
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(4,minmax(0,4.5rem))_minmax(0,1fr)_minmax(0,8rem)]">
                            {SIZE_FIELDS.map(({ key, label, unit }) => (
                              <Input
                                key={key}
                                inputMode="decimal"
                                value={row[key]}
                                onChange={(event) => updateRow(row.orderId, { [key]: event.target.value.replace(/[^\d.]/g, "") })}
                                aria-label={`${label} (${unit}) for ${row.orderNumber}`}
                                title={`${label} (${unit})`}
                                placeholder={unit}
                                className="h-8 tabular-nums"
                              />
                            ))}
                            <div className="col-span-2 min-w-0 sm:col-span-1">
                              <SpxItemTypeSelect
                                size="sm"
                                value={row.itemType}
                                onChange={(itemType) => updateRow(row.orderId, { itemType })}
                                aria-label={`Item type for ${row.orderNumber}`}
                              />
                            </div>
                            <div className="col-span-2 min-w-0 sm:col-span-1">
                              <Select
                                value={row.payer}
                                onValueChange={(payer) => payer && updateRow(row.orderId, { payer: payer as SpxPayer })}
                              >
                                <SelectTrigger size="sm" aria-label={`Who pays SPX for ${row.orderNumber}`} className="w-full min-w-0">
                                  <SelectValue>{(value: string | null) => value ?? row.payer}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sender Pay">Sender Pay</SelectItem>
                                  <SelectItem value="Receiver Pay">Receiver Pay</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <p className="-mt-1 text-[11px] text-muted-foreground">Weight kg · length × width × height cm</p>
                          <Input
                            value={row.itemName}
                            onChange={(event) => updateRow(row.orderId, { itemName: event.target.value })}
                            maxLength={250}
                            aria-label={`Item name for ${row.orderNumber}`}
                            placeholder="Item name"
                            className="h-8"
                          />
                          {problems.length > 0 && (
                            <ul className="flex flex-col gap-0.5 text-xs text-destructive">
                              {problems.map((problem) => (
                                <li key={problem}>{problem}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </DialogBody>

        {rows && rows.length > 0 && (
          <DialogFooter className="items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              {withProblems.length > 0
                ? `${withProblems.length} selected ${withProblems.length === 1 ? "order needs" : "orders need"} fixing`
                : `${chosen.length} of ${rows.length} selected`}
            </span>
            <Button onClick={handleDownload} disabled={!chosen.length || withProblems.length > 0 || isDownloading}>
              {isDownloading ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
              Download for SPX ({chosen.length})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
