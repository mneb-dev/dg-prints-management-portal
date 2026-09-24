import { useEffect, type ComponentProps, type MouseEvent } from "react"
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
import { useNewProducts } from "@/lib/products"
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
  useSidebar,
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
  const { newProductCount, newProductDays } = useNewProducts()
  const { setOpenMobile } = useSidebar()

  // On phones the sidebar is a modal drawer; close it once a nav link has changed the route.
  useEffect(() => {
    setOpenMobile(false)
  }, [location.pathname, setOpenMobile])

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
                  // Orders: a neutral count of active orders. Products: a brand-tinted count of
                  // products added in the last week ("new").
                  const badge =
                    item.url === "/orders" && activeOrders > 0
                      ? { count: activeOrders, noun: "active", label: `${activeOrders} active orders`, isNew: false }
                      : item.url === "/products" && newProductCount > 0
                        ? {
                            count: newProductCount,
                            noun: `new in the last ${newProductDays} days`,
                            label: `${newProductCount} new ${newProductCount === 1 ? "product" : "products"}`,
                            isNew: true,
                          }
                        : null
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={badge ? `${item.title} · ${badge.count} ${badge.noun}` : item.title}
                        isActive={isActive}
                        onClick={guardedNavClick(item.url)}
                        render={<NavLink to={item.url} />}
                        className={NAV_BUTTON_CLASSNAME}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        {badge?.isNew ? (
                          // Collapsed (icon-only) rail: the count badge hides, so a dot on the icon
                          // keeps "something new here" visible.
                          <span
                            aria-hidden
                            className="absolute top-1.5 left-5 hidden size-2 rounded-full bg-sidebar-primary ring-2 ring-sidebar group-data-[collapsible=icon]:block"
                          />
                        ) : null}
                      </SidebarMenuButton>
                      {badge ? (
                        <SidebarMenuBadge
                          aria-label={badge.label}
                          className={cn(
                            "rounded-full px-1.5",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground peer-hover/menu-button:text-sidebar-primary-foreground peer-data-active/menu-button:text-sidebar-primary-foreground"
                              : badge.isNew
                                ? "bg-sidebar-primary/10 font-semibold text-sidebar-primary peer-hover/menu-button:text-sidebar-primary"
                                : "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                        >
                          {formatBadgeCount(badge.count)}
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
