import type { ComponentProps } from "react"
import {
  CalculatorIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingCartIcon,
  UsersIcon,
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import dgPrintsLogo from "@/assets/images/dg_prints_logo.jpg"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/lib/auth"
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
  { title: "Users", url: "/users", icon: UsersIcon },
]

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { role } = useAuth()
  const visibleNavItems = navItems.filter((item) => item.title !== "Users" || role !== "staff")

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<NavLink to="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-black">
                <img
                  src={dgPrintsLogo}
                  alt="DG Prints"
                  className="size-full object-cover object-top"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">DG Prints</span>
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
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  location.pathname.startsWith(`${item.url}/`)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        isActive &&
                          "relative after:absolute after:inset-y-1.5 after:left-0 after:w-0.5 after:rounded-full after:bg-primary"
                      )}
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
