import { useMemo, useState } from "react"
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import { toast } from "sonner"

import { CommissionByStaffTable } from "@/components/commission/commission-by-staff-table"
import { CommissionFilterBar, type CommissionReleaseFilter } from "@/components/commission/commission-filter-bar"
import { CommissionOrdersTable } from "@/components/commission/commission-orders-table"
import { CommissionSummaryCards } from "@/components/commission/commission-summary-cards"
import { getCommissionReleaseStatus } from "@/components/commission/commission-release-badge"
import { IncentiveHistoryTable } from "@/components/commission/incentive-history-table"
import { IncentiveOwnShareChart } from "@/components/commission/incentive-own-share-chart"
import { IncentiveStaffShareTable } from "@/components/commission/incentive-staff-share-table"
import { IncentiveTierProgress } from "@/components/commission/incentive-tier-progress"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import {
  STAFF_COMMISSION_PRESETS,
  useCommissionOrders,
  useCommissionReleaseActions,
  useCommissionSummary,
  useMonthlyIncentiveSummary,
  usePreviousMonthlyIncentiveSummary,
} from "@/lib/commission"
import { computePeriodRange, PERIOD_PRESETS, type PeriodPreset } from "@/lib/finance-period"
import { useUserOptions } from "@/lib/users"

export function IncentivesPage() {
  const { role } = useAuth()
  const isStaffView = role === "staff"
  const presets = isStaffView ? STAFF_COMMISSION_PRESETS : PERIOD_PRESETS

  const [preset, setPreset] = useState<PeriodPreset>("this_week")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [releaseFilter, setReleaseFilter] = useState<CommissionReleaseFilter>("all")
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

  // Fixed to "this calendar month" -- the incentive tab has no date filter of its own, since the
  // monthly incentive pool is an inherently monthly concept, not a lookback window to widen.
  const monthlyIncentiveRange = useMemo(() => computePeriodRange("this_month", "", "", new Date()), [])
  const monthlyIncentiveDateFrom = monthlyIncentiveRange ? format(monthlyIncentiveRange.start, "yyyy-MM-dd") : ""
  const monthlyIncentiveDateTo = monthlyIncentiveRange ? format(monthlyIncentiveRange.end, "yyyy-MM-dd") : ""
  const monthlyIncentivePeriodLabel = monthlyIncentiveRange ? format(monthlyIncentiveRange.start, "MMMM yyyy") : ""
  const {
    data: monthlyIncentive,
    isLoading: isMonthlyIncentiveLoading,
    isError: isMonthlyIncentiveError,
  } = useMonthlyIncentiveSummary(monthlyIncentiveDateFrom, monthlyIncentiveDateTo)

  // Staff-only comparison data: last calendar month is always fully elapsed, so no "clamp to
  // today" logic is needed here the way computePeriodRange's in-progress-period clamp assumes.
  const previousMonthAnchor = useMemo(() => subMonths(new Date(), 1), [])
  const previousMonthDateFrom = isStaffView ? format(startOfMonth(previousMonthAnchor), "yyyy-MM-dd") : ""
  const previousMonthDateTo = isStaffView ? format(endOfMonth(previousMonthAnchor), "yyyy-MM-dd") : ""
  const previousMonthPeriodLabel = format(previousMonthAnchor, "MMMM yyyy")
  const {
    data: previousMonthlyIncentive,
    isLoading: isPreviousMonthlyIncentiveLoading,
    isError: isPreviousMonthlyIncentiveError,
  } = usePreviousMonthlyIncentiveSummary(previousMonthDateFrom, previousMonthDateTo)

  const comparisonPercent =
    monthlyIncentive?.ownShare &&
    previousMonthlyIncentive?.ownShare &&
    previousMonthlyIncentive.ownShare.commissionShare > 0
      ? ((monthlyIncentive.ownShare.commissionShare - previousMonthlyIncentive.ownShare.commissionShare) /
          previousMonthlyIncentive.ownShare.commissionShare) *
        100
      : null

  const { rows, isLoading, isError, refetch: refetchSummary } = useCommissionSummary(dateFrom, dateTo, layoutBy)
  const {
    rows: orderRows,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useCommissionOrders(dateFrom, dateTo, layoutBy)
  const { release, unrelease } = useCommissionReleaseActions()

  const filteredOrderRows = useMemo(() => {
    if (releaseFilter === "all") return orderRows
    return orderRows.filter((row) => {
      const status = getCommissionReleaseStatus(row.paymentStatus, row.releasedAt)
      return releaseFilter === "released" ? status === "released" : status !== "released"
    })
  }, [orderRows, releaseFilter])

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
      <PageHeader title="Incentives" description="Two separate ways staff earn from sales — pick a tab below." />

      <Tabs defaultValue="incentives">
        <TabsList>
          <TabsTrigger value="incentives">Sales-target Bonus</TabsTrigger>
          <TabsTrigger value="layout">Layout Commission</TabsTrigger>
          <TabsIndicator />
        </TabsList>

        <TabsContent value="incentives" className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            {isStaffView
              ? `A team-wide bonus for ${monthlyIncentivePeriodLabel}, separate from your layout commission, split by each staff member's share of this month's sales.`
              : `A team-wide bonus pool for ${monthlyIncentivePeriodLabel}, separate from layout commission — unlocked by total staff sales and split by each staff member's share.`}
          </p>

          <IncentiveTierProgress
            periodLabel={monthlyIncentivePeriodLabel}
            totalStaffSales={monthlyIncentive?.totalStaffSales ?? 0}
            pool={monthlyIncentive?.pool ?? 0}
            tiers={monthlyIncentive?.tiers ?? []}
            isLoading={isMonthlyIncentiveLoading && !monthlyIncentive}
            isError={isMonthlyIncentiveError}
            isStaffView={isStaffView}
          />

          {isStaffView ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <IncentiveOwnShareChart
                periodLabel={monthlyIncentivePeriodLabel}
                ownShare={monthlyIncentive?.ownShare ?? null}
                pool={monthlyIncentive?.pool ?? 0}
                isLoading={isMonthlyIncentiveLoading && !monthlyIncentive}
                isError={isMonthlyIncentiveError}
                comparisonPercent={comparisonPercent}
              />
              <IncentiveOwnShareChart
                periodLabel={previousMonthPeriodLabel}
                ownShare={previousMonthlyIncentive?.ownShare ?? null}
                pool={previousMonthlyIncentive?.pool ?? 0}
                isLoading={isPreviousMonthlyIncentiveLoading && !previousMonthlyIncentive}
                isError={isPreviousMonthlyIncentiveError}
              />
            </div>
          ) : null}

          {!isStaffView ? (
            <>
              <IncentiveStaffShareTable
                rows={monthlyIncentive?.perStaff ?? []}
                isLoading={isMonthlyIncentiveLoading && !monthlyIncentive}
                isError={isMonthlyIncentiveError}
              />
              <IncentiveHistoryTable />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="layout" className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            {isStaffView
              ? "Your commission for layout work, for the period selected below, including which orders have been released to you."
              : "Commission earned per order from layout work, for the period selected below — release it once a staff member's pay is due."}
          </p>

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
            releaseFilter={releaseFilter}
            onReleaseFilterChange={setReleaseFilter}
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
            rows={filteredOrderRows}
            isLoading={showOrdersSkeleton}
            isError={isOrdersError}
            isStaffView={isStaffView}
            showStaffColumn={!isStaffView && !selectedStaffId}
            onRelease={handleRelease}
            onUnrelease={handleUnrelease}
            isMutating={isMutating}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
