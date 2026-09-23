import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon, UserIcon } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"
import { getAvatarDataUri } from "@/lib/avatars"
import { useNavGuard } from "@/lib/nav-guard"
import { cn } from "@/lib/utils"

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Super Admin",
}

// Same soft indigo tone as the dashboard's customer avatars.
const AVATAR_FALLBACK_CLASSNAME = "bg-accent text-accent-foreground font-semibold"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, logout, role, hasPermission } = useAuth()
  const { requestNavigation } = useNavGuard()
  const navigate = useNavigate()
  const location = useLocation()
  const canManageSettings = role === "superadmin" || hasPermission("manage_settings")

  // Same unsaved-changes guard the sidebar links use: if a dirty form is open, it prompts first
  // and navigates itself once confirmed.
  function goTo(path: string) {
    if (requestNavigation(path)) navigate(path)
  }

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "Signed in"
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "?"
    : "?"
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : ""

  const avatar = (
    <Avatar>
      {user?.avatar && <AvatarImage src={getAvatarDataUri(user.avatar)} alt="" />}
      <AvatarFallback className={AVATAR_FALLBACK_CLASSNAME}>{initials}</AvatarFallback>
    </Avatar>
  )

  const menuItems = [
    { path: "/profile", label: "Profile", icon: UserIcon, visible: true },
    { path: "/settings", label: "Settings", icon: SettingsIcon, visible: canManageSettings },
  ].filter((item) => item.visible)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Account menu for ${displayName}`}
                className="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
              />
            }
          >
            {avatar}
            <div className="grid flex-1 gap-1 text-left leading-none group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 opacity-60 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-60"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2.5 px-1.5 py-2 text-left">
                  {avatar}
                  <div className="grid min-w-0 flex-1 gap-1 leading-none">
                    <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.username ? `@${user.username}` : null}
                      {user?.username && roleLabel ? " · " : null}
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {menuItems.map((item) => {
                const isCurrent = location.pathname === item.path
                return (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => goTo(item.path)}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(isCurrent && "font-medium [&>svg]:text-primary")}
                  >
                    <item.icon />
                    <span className="leading-none">{item.label}</span>
                    {isCurrent ? (
                      <span aria-hidden className="ml-auto size-1.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              <span className="leading-none">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
