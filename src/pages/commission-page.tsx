import { useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"

import { CommissionByStaffTable } from "@/components/commission/commission-by-staff-table"
import { CommissionFilterBar } from "@/components/commission/commission-filter-bar"
import { CommissionOrdersTable } from "@/components/commission/commission-orders-table"
import { CommissionSummaryCards } from "@/components/commission/commission-summary-cards"
import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/lib/auth"
import {
  STAFF_COMMISSION_PRESETS,
  useCommissionOrders,
  useCommissionReleaseActions,
  useCommissionSummary,
} from "@/lib/commission"
import { computePeriodRange, PERIOD_PRESETS, type PeriodPreset } from "@/lib/finance-period"
import { useUserOptions } from "@/lib/users"

export function CommissionPage() {
  const { role } = useAuth()
  const isStaffView = role === "staff"
  const presets = isStaffView ? STAFF_COMMISSION_PRESETS : PERIOD_PRESETS

  const [preset, setPreset] = useState<PeriodPreset>("this_week")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [isMutating, setIsMutating] = useState(false)

  const range = useMemo(
    () => computePeriodRange(preset, customFrom, customTo, new Date()),
    [preset, customFrom, customTo]
  )
  const dateFrom = range ? format(range.start, "yyyy-MM-dd") : ""
  const dateTo = range ? format(range.end, "yyyy-MM-dd") : ""
  const layoutBy = isStaffView ? undefined : selectedStaffId || undefined

  // Admin/superadmin only: roster for the "filter by staff member" picker. Restricted to role
  // "staff" since that's who commission is meaningfully tracked for.
  const { users: staffOptions } = useUserOptions(!isStaffView, true, "staff")

  const { rows, isLoading, isError, refetch: refetchSummary } = useCommissionSummary(dateFrom, dateTo, layoutBy)
  const {
    rows: orderRows,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useCommissionOrders(dateFrom, dateTo, layoutBy)
  const { release, unrelease } = useCommissionReleaseActions()

  // Once rows have loaded once, keep them visible while a filter change refetches in the
  // background instead of flashing every card back to a skeleton — only the first load blocks.
  const showSkeleton = isLoading && rows.length === 0
  const showOrdersSkeleton = isOrdersLoading && orderRows.length === 0

  const own = rows[0]
  const sum = (key: "paidCommission" | "unpaidCommission" | "totalCommission" | "paidOrderCount" | "unpaidOrderCount" | "totalOrderCount" | "releasedCommission" | "releasedOrderCount" | "pendingReleaseCommission" | "pendingReleaseOrderCount") =>
    isStaffView ? (own?.[key] ?? 0) : rows.reduce((total, row) => total + row[key], 0)

  async function handleRelease(orderIds: string[]) {
    setIsMutating(true)
    try {
      const releasedIds = await release(orderIds)
      if (releasedIds.length === orderIds.length) {
        toast.success("Commission released.")
      } else {
        toast.success(`${releasedIds.length} of ${orderIds.length} commissions released.`)
      }
      refetchOrders()
      refetchSummary()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to release commission.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleUnrelease(orderIds: string[]) {
    setIsMutating(true)
    try {
      await unrelease(orderIds)
      toast.success("Commission release undone.")
      refetchOrders()
      refetchSummary()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to undo commission release.")
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Commissions"
        description={
          isStaffView
            ? "Your layout commission for the selected period, including which orders have been released to you."
            : "Track layout commission earned by staff and release it once their pay is due."
        }
      />

      <CommissionFilterBar
        presets={presets}
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
        staffOptions={isStaffView ? undefined : staffOptions}
        selectedStaffId={isStaffView ? undefined : selectedStaffId}
        onSelectedStaffIdChange={isStaffView ? undefined : setSelectedStaffId}
      />

      <CommissionSummaryCards
        totalCommission={sum("totalCommission")}
        totalOrderCount={sum("totalOrderCount")}
        unpaidCommission={sum("unpaidCommission")}
        unpaidOrderCount={sum("unpaidOrderCount")}
        paidCommission={sum("paidCommission")}
        paidOrderCount={sum("paidOrderCount")}
        releasedCommission={sum("releasedCommission")}
        releasedOrderCount={sum("releasedOrderCount")}
        pendingReleaseCommission={sum("pendingReleaseCommission")}
        pendingReleaseOrderCount={sum("pendingReleaseOrderCount")}
        isLoading={showSkeleton}
      />

      {!isStaffView ? <CommissionByStaffTable rows={rows} isLoading={showSkeleton} isError={isError} /> : null}

      <CommissionOrdersTable
        rows={orderRows}
        isLoading={showOrdersSkeleton}
        isError={isOrdersError}
        isStaffView={isStaffView}
        showStaffColumn={!isStaffView && !selectedStaffId}
        onRelease={handleRelease}
        onUnrelease={handleUnrelease}
        isMutating={isMutating}
      />
    </div>
  )
}
