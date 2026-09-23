import { useMemo, useState } from "react"
import { format } from "date-fns"
import {
  CreditCardIcon,
  Loader2Icon,
  PieChartIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  Share2Icon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react"

import { Money } from "@/components/money"
import { DateRangeFilter } from "@/components/date-range-filter"
import { StatCard } from "@/components/dashboard/stat-card"
import { BreakdownCard } from "@/components/finance/breakdown-card"
import { FinanceTrendChartCard } from "@/components/finance/finance-trend-chart-card"
import { PageHeader } from "@/components/page-header"
import { PeriodTrack } from "@/components/period-track"
import { Skeleton } from "@/components/ui/skeleton"
import { EXPENSE_CATEGORIES } from "@/lib/expenses"
import { computePeriodRange, PERIOD_PRESETS, type PeriodPreset, type PeriodRange } from "@/lib/finance-period"
import { useFinanceSummary } from "@/lib/finance"
import { useSalesVisibility } from "@/lib/sales-visibility"
import { formatCurrency } from "@/lib/utils"

// Share-of-revenue percentages for the KPI cards, computed from the already-fetched summary
// (no extra request). Returns null when there's no meaningful denominator to divide by.
function formatSharePercent(value: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((value / total) * 100)
}

/** "Sep 1 – Sep 24, 2026", or "Dec 1, 2025 – Jan 15, 2026" across years. */
function formatRange(range: PeriodRange): string {
  const sameYear = range.start.getFullYear() === range.end.getFullYear()
  return `${format(range.start, sameYear ? "MMM d" : "MMM d, yyyy")} – ${format(range.end, "MMM d, yyyy")}`
}

export function FinancePage() {
  const [preset, setPreset] = useState<PeriodPreset>("this_month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  const range = useMemo(
    () => computePeriodRange(preset, customFrom, customTo, new Date()),
    [preset, customFrom, customTo]
  )
  const dateFrom = range ? format(range.start, "yyyy-MM-dd") : ""
  const dateTo = range ? format(range.end, "yyyy-MM-dd") : ""

  const { summary, isLoading, isError } = useFinanceSummary(dateFrom, dateTo)
  const { isVisible } = useSalesVisibility()

  // Once a summary has loaded, keep it visible while a range change refetches in the background
  // instead of flashing every card back to a skeleton — only the very first load blocks on one.
  const showSkeleton = isLoading && !summary
  const isRefreshing = isLoading && !!summary
  const totalRevenue = summary?.totalRevenue ?? 0
  const totalExpenses = summary?.totalExpenses ?? 0
  const netProfit = summary?.netProfit ?? 0
  const outstandingBalance = summary?.outstandingBalance ?? 0
  const orderCount = summary?.revenueOrderCount ?? 0
  const expenseCount = summary?.expenseCount ?? 0

  const expensesPct = formatSharePercent(totalExpenses, totalRevenue)
  const netProfitPct = formatSharePercent(netProfit, totalRevenue)
  // The server buckets orders without a payment method under "unspecified".
  const paymentMethodData = Object.fromEntries(
    Object.entries(summary?.revenueByPaymentMethod ?? {}).map(([method, amount]) => [
      method === "unspecified" ? "Not specified" : method,
      amount,
    ])
  )
  const money = (amount: number) => <Money amount={amount} hidden={!isVisible} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finance"
        description={range ? formatRange(range) : "Pick a start and end date"}
        actions={
          isRefreshing ? (
            <span className="flex items-center gap-1.5 rounded-full bg-background px-2 py-1 text-xs text-muted-foreground ring-1 ring-border">
              <Loader2Icon className="size-3.5 animate-spin" />
              Updating…
            </span>
          ) : undefined
        }
      />

      {/* One period control for the whole page: KPIs, chart and breakdowns all follow it. */}
      <div className="-mt-2 flex flex-col gap-3">
        <PeriodTrack presets={PERIOD_PRESETS} value={preset} onChange={setPreset} />
        {preset === "custom" && (
          <div className="animate-in duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none">
            <DateRangeFilter
              id="finance-date-range"
              from={customFrom}
              to={customTo}
              onChange={(from, to) => {
                setCustomFrom(from)
                setCustomTo(to)
              }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {showSkeleton ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[88px] w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={TrendingUpIcon}
              label="Revenue"
              value={money(totalRevenue)}
              description={`From ${orderCount.toLocaleString()} fully paid ${orderCount === 1 ? "order" : "orders"}`}
            />
            <StatCard
              icon={ReceiptTextIcon}
              label="Expenses"
              value={formatCurrency(totalExpenses)}
              description={
                `${expenseCount.toLocaleString()} logged` +
                (expensesPct !== null && isVisible ? ` · ${expensesPct}% of revenue` : "")
              }
            />
            <StatCard
              icon={PiggyBankIcon}
              label={netProfit < 0 && isVisible ? "Net loss" : "Net profit"}
              value={money(netProfit)}
              valueClassName={isVisible && netProfit < 0 ? "text-destructive" : undefined}
              description={netProfitPct !== null && isVisible ? `${netProfitPct}% margin` : "Revenue minus expenses"}
            />
            <StatCard
              icon={WalletIcon}
              label="Outstanding"
              value={formatCurrency(outstandingBalance)}
              description="Unpaid balance on orders"
            />
          </>
        )}
      </div>

      <FinanceTrendChartCard
        range={range}
        series={summary?.series ?? []}
        totals={{ revenue: totalRevenue, expenses: totalExpenses, net: netProfit }}
        isLoading={showSkeleton}
        isError={isError}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard
          icon={ReceiptTextIcon}
          title="Expenses by category"
          description="Where the money went"
          data={summary?.expensesByCategory ?? {}}
          order={EXPENSE_CATEGORIES}
          isLoading={showSkeleton}
          isError={isError}
          emptyIcon={PieChartIcon}
          emptyTitle="No expenses in this period"
          emptyDescription="The category breakdown appears once expenses are logged."
        />
        <BreakdownCard
          icon={Share2Icon}
          title="Revenue by channel"
          description="Where paid orders came from"
          data={summary?.revenueByChannel ?? {}}
          masked={!isVisible}
          isLoading={showSkeleton}
          isError={isError}
          emptyIcon={Share2Icon}
          emptyTitle="No revenue in this period"
          emptyDescription="The channel breakdown appears once orders are paid."
        />
        <BreakdownCard
          icon={CreditCardIcon}
          title="Payment methods"
          description="How customers paid"
          data={paymentMethodData}
          masked={!isVisible}
          isLoading={showSkeleton}
          isError={isError}
          emptyIcon={CreditCardIcon}
          emptyTitle="No revenue in this period"
          emptyDescription="The payment method breakdown appears once orders are paid."
        />
      </div>
    </div>
  )
}
