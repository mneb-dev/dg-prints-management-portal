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
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import { Logo } from "@/components/logo"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/lib/auth"
import { useNavGuard } from "@/lib/nav-guard"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Orders", url: "/orders", icon: ShoppingCartIcon },
  { title: "Products", url: "/products", icon: PackageIcon },
  { title: "Calculator", url: "/calculator", icon: CalculatorIcon },
  { title: "Expenses", url: "/expenses", icon: ReceiptTextIcon },
  { title: "Finance", url: "/finance", icon: LineChartIcon },
  { title: "Incentives", url: "/incentives", icon: TrophyIcon },
  { title: "Users", url: "/users", icon: UsersIcon },
]

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { role, hasPermission } = useAuth()
  const { requestNavigation } = useNavGuard()
  const visibleNavItems = navItems.filter(
    (item) =>
      (item.url !== "/users" || role !== "staff") &&
      (item.url !== "/expenses" || hasPermission("manage_expenses")) &&
      (item.url !== "/finance" || role === "admin" || role === "superadmin") &&
      (item.url !== "/incentives" || hasPermission("manage_incentives"))
  )

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
              render={<NavLink to="/dashboard" />}
            >
              <div className="flex shrink-0 items-center justify-center">
                <Logo className="size-10 group-data-[collapsible=icon]:size-8" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visibleNavItems.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  location.pathname.startsWith(`${item.url}/`)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      onClick={guardedNavClick(item.url)}
                      render={<NavLink to={item.url} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
