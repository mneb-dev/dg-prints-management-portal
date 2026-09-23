import { useMemo, useState } from "react"
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import { PenToolIcon, TrophyIcon } from "lucide-react"
import { toast } from "sonner"

import { CommissionByStaffTable } from "@/components/commission/commission-by-staff-table"
import { CommissionFilterBar, type CommissionReleaseFilter } from "@/components/commission/commission-filter-bar"
import { CommissionOrdersTable } from "@/components/commission/commission-orders-table"
import { CommissionSummaryCards } from "@/components/commission/commission-summary-cards"
import { IncentiveHistoryTable } from "@/components/commission/incentive-history-table"
import { IncentiveOwnShareChart } from "@/components/commission/incentive-own-share-chart"
import { IncentiveStaffShareTable } from "@/components/commission/incentive-staff-share-table"
import { IncentiveTierProgress } from "@/components/commission/incentive-tier-progress"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
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
import { useClampPage } from "@/lib/pagination"
import { useUserOptions } from "@/lib/users"

type IncentivesTab = "incentives" | "layout"

const TAB_DESCRIPTIONS: Record<IncentivesTab, string> = {
  incentives: "Monthly team bonus, split by each person's share of sales",
  layout: "Per-order commission for layout work",
}

// Segmented tabs — the same raised-pill track as the app's other one-click switchers.
const TAB_CLASS =
  "h-7 gap-1.5 rounded-md px-3 hover:text-foreground data-[active]:font-semibold data-[active]:text-accent-foreground [&_svg]:size-4"

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
  const [tab, setTab] = useState<IncentivesTab>("incentives")

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
  // Any filter change sends the orders table back to page 1: the stored page only counts while the
  // filters it was picked under are still the current ones.
  const ordersFilterKey = `${dateFrom}|${dateTo}|${layoutBy ?? ""}|${releaseFilter}`
  const [ordersPageState, setOrdersPageState] = useState({ filterKey: ordersFilterKey, page: 1 })
  const ordersPage = ordersPageState.filterKey === ordersFilterKey ? ordersPageState.page : 1
  const setOrdersPage = (page: number) => setOrdersPageState({ filterKey: ordersFilterKey, page })
  const [ordersPageSize, setOrdersPageSize] = useState(10)

  const {
    rows: orderRows,
    total: orderTotal,
    pendingReleaseIds,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useCommissionOrders({
    dateFrom,
    dateTo,
    layoutBy,
    release: releaseFilter,
    page: ordersPage,
    pageSize: ordersPageSize,
  })
  useClampPage(ordersPage, ordersPageSize, orderTotal, isOrdersFetching, setOrdersPage)
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
      <PageHeader title="Incentives" description={TAB_DESCRIPTIONS[tab]} />

      <Tabs value={tab} onValueChange={(value) => setTab(value as IncentivesTab)}>
        <TabsList className="w-fit gap-0.5 rounded-lg border border-input bg-muted/60 p-0.5">
          <TabsTrigger value="incentives" className={TAB_CLASS}>
            <TrophyIcon aria-hidden />
            Sales-target bonus
          </TabsTrigger>
          <TabsTrigger value="layout" className={TAB_CLASS}>
            <PenToolIcon aria-hidden />
            Layout commission
          </TabsTrigger>
          <TabsIndicator className="top-0.5 bottom-0.5 z-0 h-auto rounded-md bg-accent shadow-sm ring-1 ring-primary/40" />
        </TabsList>

        <TabsContent
          value="incentives"
          className="flex animate-in flex-col gap-6 duration-200 fade-in-0 motion-reduce:animate-none"
        >

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

        <TabsContent
          value="layout"
          className="flex animate-in flex-col gap-6 duration-200 fade-in-0 motion-reduce:animate-none"
        >

          <CommissionFilterBar
            presets={presets}
            preset={preset}
            onPresetChange={setPreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomRangeChange={(from, to) => {
              setCustomFrom(from)
              setCustomTo(to)
            }}
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
            rows={orderRows}
            total={orderTotal}
            pendingReleaseIds={pendingReleaseIds}
            isLoading={showOrdersSkeleton}
            isError={isOrdersError}
            isStaffView={isStaffView}
            showStaffColumn={!isStaffView && !selectedStaffId}
            onRelease={handleRelease}
            onUnrelease={handleUnrelease}
            isMutating={isMutating}
            footer={
              orderTotal > 0 && (
                <PaginationBar
                  page={ordersPage}
                  pageSize={ordersPageSize}
                  total={orderTotal}
                  itemLabel="orders"
                  onPageChange={setOrdersPage}
                  onPageSizeChange={(pageSize) => {
                    setOrdersPageSize(pageSize)
                    setOrdersPage(1)
                  }}
                  disabled={isOrdersFetching || isOrdersError}
                />
              )
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
