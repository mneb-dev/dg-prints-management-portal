import { BoxIcon, ClockIcon, PlusIcon, TruckIcon, WalletIcon } from "lucide-react"
import { Link } from "react-router-dom"

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
import { useCustomerRankings, useOrderStats } from "@/lib/orders"
import { formatCurrency } from "@/lib/utils"

export function DashboardPage() {
  const { hasPermission } = useAuth()
  const { stats } = useOrderStats()
  const { customerNames } = useCustomerRankings()

  const pendingCount = stats?.byStatus["pending"] ?? 0
  const inProductionCount = ["layout", "trace", "print", "cut", "pack"].reduce(
    (sum, status) => sum + (stats?.byStatus[status] ?? 0),
    0
  )
  const readyForPickupCount = stats?.byStatus["pickup"] ?? 0
  const unpaidTotal = stats?.outstandingBalance ?? 0

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={ClockIcon}
          label="Awaiting layout"
          value={pendingCount}
          tone={pendingCount > 0 ? "warning" : "default"}
          href="/orders"
        />
        <StatCard icon={BoxIcon} label="In production" value={inProductionCount} href="/orders" />
        <StatCard icon={TruckIcon} label="Ready for pickup" value={readyForPickupCount} href="/orders" />
        <StatCard
          icon={WalletIcon}
          label="Outstanding balance"
          value={formatCurrency(unpaidTotal)}
          tone={unpaidTotal > 0 ? "warning" : "default"}
          description={`${customerNames.length} tracked customers`}
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
