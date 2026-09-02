import { useEffect } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import { getBreadcrumbSegments } from "@/lib/breadcrumbs"
import { NavGuardProvider } from "@/lib/nav-guard"

export function AppLayout() {
  const location = useLocation()
  const segments = getBreadcrumbSegments(location.pathname)
  const { refreshCurrentUser } = useAuth()

  useEffect(() => {
    refreshCurrentUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <TooltipProvider>
      <NavGuardProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              {segments.length > 0 && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {segments.map((segment, index) => (
                      <div key={segment.label} className="flex items-center gap-1.5">
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {segment.href ? (
                            <BreadcrumbLink render={<Link to={segment.href} />}>
                              {segment.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
              <ThemeToggle className="ml-auto" />
            </header>
            <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 md:p-6">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </NavGuardProvider>
    </TooltipProvider>
  )
}
