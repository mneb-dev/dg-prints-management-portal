import { PlusIcon } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { ORDER_STATUS_ICONS } from "@/components/orders/order-status-badge"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { ChannelMixCard } from "@/components/dashboard/channel-mix-card"
import { HotProductsCard } from "@/components/dashboard/hot-products-card"
import { PaymentSummaryCard } from "@/components/dashboard/payment-summary-card"
import { RecentOrdersCard } from "@/components/dashboard/recent-orders-card"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPipelineCard } from "@/components/dashboard/status-pipeline-card"
import { TopCustomersCard } from "@/components/dashboard/top-customers-card"
import { useAuth } from "@/lib/auth"
import { useOrderActions, useOrderStats } from "@/lib/orders"

export function DashboardPage() {
  const { hasPermission } = useAuth()
  const { stats } = useOrderStats()
  const { setOrdersFilter } = useOrderActions()
  const navigate = useNavigate()

  const pendingCount = stats?.byStatus["pending"] ?? 0
  const layoutCount = stats?.byStatus["layout"] ?? 0
  const traceCount = stats?.byStatus["trace"] ?? 0
  const printCount = stats?.byStatus["print"] ?? 0
  const cutCount = stats?.byStatus["cut"] ?? 0
  const packCount = stats?.byStatus["pack"] ?? 0
  const readyForPickupCount = stats?.byStatus["pickup"] ?? 0

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
          hasPermission("manage_orders") ? (
            <Button render={<Link to="/orders/new" />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              New Order
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        <StatCard
          icon={ORDER_STATUS_ICONS.pending}
          label="Pending"
          value={pendingCount}
          onClick={() => goToOrders("pending")}
        />
        <StatCard
          icon={ORDER_STATUS_ICONS.layout}
          label="Awaiting layout"
          value={layoutCount}
          onClick={() => goToOrders("layout")}
        />
        <StatCard
          icon={ORDER_STATUS_ICONS.trace}
          label="Awaiting trace"
          value={traceCount}
          onClick={() => goToOrders("trace")}
        />
        <StatCard
          icon={ORDER_STATUS_ICONS.print}
          label="Awaiting print"
          value={printCount}
          onClick={() => goToOrders("print")}
        />
        <StatCard
          icon={ORDER_STATUS_ICONS.cut}
          label="Awaiting cut"
          value={cutCount}
          onClick={() => goToOrders("cut")}
        />
        <StatCard
          icon={ORDER_STATUS_ICONS.pack}
          label="Awaiting pack"
          value={packCount}
          onClick={() => goToOrders("pack")}
        />
        <StatCard
          icon={ORDER_STATUS_ICONS.pickup}
          label="Ready for pickup"
          value={readyForPickupCount}
          onClick={() => goToOrders("pickup")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatusPipelineCard />
        <PaymentSummaryCard />
        <RecentOrdersCard />
        <HotProductsCard />
        <TopCustomersCard />
        <ChannelMixCard />
      </div>
    </div>
  )
}
