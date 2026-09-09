import { PlusIcon } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/page-header"
import { RefreshButton } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
import { ChannelMixCard } from "@/components/dashboard/channel-mix-card"
import { HotProductsCard } from "@/components/dashboard/hot-products-card"
import { PaymentSummaryCard } from "@/components/dashboard/payment-summary-card"
import { RecentOrdersCard } from "@/components/dashboard/recent-orders-card"
import { SalesChartCard } from "@/components/dashboard/sales-chart-card"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPipelineCard } from "@/components/dashboard/status-pipeline-card"
import { TopCustomersCard } from "@/components/dashboard/top-customers-card"
import { useAuth } from "@/lib/auth"
import { useActiveOrderStatuses, useOrderStatusLookup } from "@/lib/order-statuses"
import {
  DASHBOARD_EXCLUDED_STATUSES,
  ORDER_TERMINAL_STATUSES,
  useDashboardRefresh,
  useOrderActions,
  useOrderStats,
} from "@/lib/orders"

export function DashboardPage() {
  const { hasPermission } = useAuth()
  const { stats } = useOrderStats()
  const { setOrdersFilter } = useOrderActions()
  const { refresh, isRefreshing } = useDashboardRefresh()
  const navigate = useNavigate()
  const { statuses } = useActiveOrderStatuses()
  const { getLabel, getIcon, getColors } = useOrderStatusLookup()

  // Every active, non-terminal, non-excluded status gets a tile, in admin-configured order —
  // including ones with a current count of 0, since the loop is driven by the master status
  // list, not by which keys stats.byStatus happens to have.
  const workflowStatuses = statuses.filter(
    (s) => !ORDER_TERMINAL_STATUSES.includes(s.name) && !DASHBOARD_EXCLUDED_STATUSES.includes(s.name)
  )

  function goToOrders(status: string) {
    setOrdersFilter({ status, page: 1 })
    navigate("/orders")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Snapshot of orders, payments, and demand."
        actions={
          <>
            <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />
            {hasPermission("manage_orders") ? (
              <Button render={<Link to="/orders/new" />} nativeButton={false}>
                <PlusIcon data-icon="inline-start" />
                <span className="hidden sm:inline">New Order</span>
              </Button>
            ) : undefined}
          </>
        }
      />

      <div className="flex min-w-0 gap-3 overflow-x-auto overflow-y-visible p-2 sm:overflow-visible sm:p-0">
        {workflowStatuses.map((item) => (
          <div key={item.id} className="w-32 shrink-0 sm:w-0 sm:min-w-0 sm:flex-1">
            <StatCard
              icon={getIcon(item.name)}
              label={getLabel(item.name)}
              value={stats?.byStatus[item.name] ?? 0}
              iconClassName={getColors(item.name).badge}
              ringClassName={getColors(item.name).ring}
              onClick={() => goToOrders(item.name)}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatusPipelineCard />
        <PaymentSummaryCard />
        <SalesChartCard />
        <RecentOrdersCard />
        <TopCustomersCard />
        <HotProductsCard className="lg:col-span-2" />
        <ChannelMixCard />
      </div>
    </div>
  )
}
