import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatRelativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "1 day ago"
  return `${diffDays} days ago`
}

/** "5s", "3m", "2h", "2d 4h", "3 mo", "1 yr" — buckets a non-negative elapsed duration.
 * Shared by `formatTimeAgo` (appends " ago") and `formatCuringDuration` (order-status.ts, no
 * suffix) so the two stay in lockstep. */
export function formatDuration(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`

  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h`

  const totalDays = Math.floor(totalHours / 24)
  if (totalDays < 30) {
    const remainingHours = totalHours % 24
    return remainingHours > 0 ? `${totalDays}d ${remainingHours}h` : `${totalDays}d`
  }

  if (totalDays < 365) return `${Math.floor(totalDays / 30)} mo`

  return `${Math.floor(totalDays / 365)} yr`
}

/** "5s ago", "3m ago", "2h ago", "2d 4h ago", "3 mo ago", "1 yr ago" — elapsed time since
 * `iso`, for the Orders table's "Last Update" column. Negative elapsed time (clock skew)
 * clamps to the 0s bucket. */
export function formatTimeAgo(iso: string | null): string {
  if (!iso) return "—"
  const elapsedMs = Math.max(0, Date.now() - new Date(iso).getTime())
  return `${formatDuration(elapsedMs)} ago`
}
