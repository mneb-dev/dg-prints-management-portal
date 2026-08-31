import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Super Admin",
}

const ROLE_VARIANTS: Record<string, "default" | "info" | "secondary"> = {
  superadmin: "default",
  admin: "info",
  staff: "secondary",
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "Signed in"
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "?"
    : "?"
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : ""
  const roleVariant = user ? (ROLE_VARIANTS[user.role] ?? "secondary") : "secondary"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}
          >
            <Avatar>
              {user?.avatar && <AvatarImage src={getAvatarDataUri(user.avatar)} alt={displayName} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <Badge variant={roleVariant} className="w-fit">
                {roleLabel}
              </Badge>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    {user?.avatar && <AvatarImage src={getAvatarDataUri(user.avatar)} alt={displayName} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <Badge variant={roleVariant} className="w-fit">
                {roleLabel}
              </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <UserIcon />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
