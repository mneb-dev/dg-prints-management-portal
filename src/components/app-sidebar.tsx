import type { ComponentProps, MouseEvent } from "react"
import {
  CalculatorIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  PackageIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  TrophyIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import { Logo } from "@/components/logo"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/lib/auth"
import { useNavGuard } from "@/lib/nav-guard"
import { DASHBOARD_EXCLUDED_STATUSES, ORDER_TERMINAL_STATUSES, useOrderStats } from "@/lib/orders"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type NavItem = { title: string; url: string; icon: LucideIcon }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Orders", url: "/orders", icon: ShoppingCartIcon },
      { title: "Products", url: "/products", icon: PackageIcon },
      { title: "Calculator", url: "/calculator", icon: CalculatorIcon },
    ],
  },
  {
    label: "Accounting",
    items: [
      { title: "Expenses", url: "/expenses", icon: ReceiptTextIcon },
      { title: "Finance", url: "/finance", icon: LineChartIcon },
      { title: "Incentives", url: "/incentives", icon: TrophyIcon },
    ],
  },
  {
    label: "Admin",
    items: [{ title: "Users", url: "/users", icon: UsersIcon }],
  },
]

/** Active item: the primitive's accent fill + bold label, plus an indigo bar on the left edge and
 * an indigo icon so the current page stands out among same-weight rows (expanded or collapsed). */
const NAV_BUTTON_CLASSNAME = cn(
  "relative",
  "before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-sidebar-primary",
  "before:opacity-0 before:transition-opacity before:duration-200 data-active:before:opacity-100",
  "data-active:[&>svg]:text-sidebar-primary"
)

function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count)
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { role, hasPermission } = useAuth()
  const { requestNavigation } = useNavGuard()
  const { stats } = useOrderStats()

  // Same definition as the dashboard pipeline's "N active orders": everything not yet released
  // and not cancelled/refunded/returned.
  const activeOrders = Object.entries(stats?.byStatus ?? {}).reduce(
    (sum, [status, count]) =>
      ORDER_TERMINAL_STATUSES.includes(status) || DASHBOARD_EXCLUDED_STATUSES.includes(status)
        ? sum
        : sum + count,
    0
  )

  function canSee(url: string): boolean {
    if (url === "/users") return role !== "staff"
    if (url === "/expenses") return hasPermission("manage_expenses")
    if (url === "/finance") return role === "admin" || role === "superadmin"
    if (url === "/incentives") return hasPermission("manage_incentives")
    return true
  }

  // Groups whose items are all hidden for this role are dropped entirely — no empty headers.
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSee(item.url)),
  })).filter((group) => group.items.length > 0)

  function guardedNavClick(url: string) {
    return (event: MouseEvent) => {
      if (!requestNavigation(url)) event.preventDefault()
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={guardedNavClick("/dashboard")}
              render={<NavLink to="/dashboard" aria-label="DG Prints — go to dashboard" />}
              className="hover:bg-transparent active:bg-transparent"
            >
              <div className="flex shrink-0 items-center justify-center">
                <Logo className="size-10 group-data-[collapsible=icon]:size-8" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[0.65rem] tracking-wider uppercase">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.url || location.pathname.startsWith(`${item.url}/`)
                  const badgeCount = item.url === "/orders" ? activeOrders : 0
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={badgeCount > 0 ? `${item.title} · ${badgeCount} active` : item.title}
                        isActive={isActive}
                        onClick={guardedNavClick(item.url)}
                        render={<NavLink to={item.url} />}
                        className={NAV_BUTTON_CLASSNAME}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {badgeCount > 0 ? (
                        <SidebarMenuBadge
                          aria-label={`${badgeCount} active orders`}
                          className={cn(
                            "rounded-full px-1.5",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground peer-hover/menu-button:text-sidebar-primary-foreground peer-data-active/menu-button:text-sidebar-primary-foreground"
                              : "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                        >
                          {formatBadgeCount(badgeCount)}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <NavUser />
        <p className="px-2 pb-1 text-center text-[0.65rem] text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
          &copy; <span className="tabular-nums">{new Date().getFullYear()}</span> DG Prints. All rights reserved.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
