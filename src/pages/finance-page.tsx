import { useMemo, useState } from "react"
import { format } from "date-fns"
import { PiggyBankIcon, ReceiptTextIcon, TrendingUpIcon, WalletIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { ExpenseBreakdownCard } from "@/components/finance/expense-breakdown-card"
import { FinanceTrendChartCard } from "@/components/finance/finance-trend-chart-card"
import { RevenueBreakdownCard } from "@/components/finance/revenue-breakdown-card"
import { Skeleton } from "@/components/ui/skeleton"
import { computePeriodRange, type PeriodPreset } from "@/lib/finance-period"
import { useFinanceSummary } from "@/lib/finance"
import { useSalesVisibility } from "@/lib/sales-visibility"
import { formatCurrency } from "@/lib/utils"

const MASKED_AMOUNT = "₱****"

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
  const netProfit = summary?.netProfit ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Finance" description="Revenue, expenses, and profit for the selected period." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {showSkeleton ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[88px] w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={TrendingUpIcon}
              label="Total Revenue"
              value={isVisible ? formatCurrency(summary?.totalRevenue ?? 0) : MASKED_AMOUNT}
              description={`${summary?.revenueOrderCount ?? 0} paid orders`}
              iconClassName="bg-status-success/10 text-status-success"
            />
            <StatCard
              icon={ReceiptTextIcon}
              label="Total Expenses"
              value={formatCurrency(summary?.totalExpenses ?? 0)}
              description={`${summary?.expenseCount ?? 0} expenses logged`}
            />
            <StatCard
              icon={PiggyBankIcon}
              label="Net Profit"
              value={isVisible ? formatCurrency(netProfit) : MASKED_AMOUNT}
              iconClassName={
                netProfit >= 0 ? "bg-status-success/10 text-status-success" : "bg-destructive/10 text-destructive"
              }
            />
            <StatCard
              icon={WalletIcon}
              label="Outstanding Balance"
              value={formatCurrency(summary?.outstandingBalance ?? 0)}
              iconClassName="bg-status-warning/10 text-status-warning"
            />
          </>
        )}
      </div>

      <FinanceTrendChartCard
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
        range={range}
        series={summary?.series ?? []}
        isLoading={showSkeleton}
        isError={isError}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpenseBreakdownCard
          expensesByCategory={summary?.expensesByCategory ?? {}}
          isLoading={showSkeleton}
          isError={isError}
        />
        <RevenueBreakdownCard
          revenueByChannel={summary?.revenueByChannel ?? {}}
          isLoading={showSkeleton}
          isError={isError}
        />
      </div>
    </div>
  )
}
