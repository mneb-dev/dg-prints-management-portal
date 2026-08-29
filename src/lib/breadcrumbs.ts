export type BreadcrumbSegment = {
  label: string
  href?: string
}

const ROUTES: { pattern: RegExp; segments: BreadcrumbSegment[] }[] = [
  { pattern: /^\/dashboard$/, segments: [{ label: "Dashboard" }] },
  { pattern: /^\/orders$/, segments: [{ label: "Orders" }] },
  {
    pattern: /^\/orders\/new$/,
    segments: [{ label: "Orders", href: "/orders" }, { label: "Create Order" }],
  },
  {
    pattern: /^\/orders\/[^/]+\/edit$/,
    segments: [{ label: "Orders", href: "/orders" }, { label: "Edit Order" }],
  },
  {
    pattern: /^\/orders\/[^/]+$/,
    segments: [{ label: "Orders", href: "/orders" }, { label: "Order Details" }],
  },
  { pattern: /^\/products$/, segments: [{ label: "Products" }] },
  { pattern: /^\/users$/, segments: [{ label: "Users" }] },
]

export function getBreadcrumbSegments(pathname: string): BreadcrumbSegment[] {
  const match = ROUTES.find((route) => route.pattern.test(pathname))
  return match?.segments ?? []
}
