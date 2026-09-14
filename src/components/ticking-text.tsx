import { useEffect, useState, type ReactNode } from "react"

/** Renders `format()`'s result, re-invoking it every `intervalMs` so time-relative text (e.g.
 * "5 minutes ago", a curing countdown) stays current. The tick timer's state lives entirely in
 * this leaf component, so it only re-renders itself on each tick — not whatever list/table
 * renders it. Previously, components needing this (order-table.tsx, order-status-menu.tsx) kept
 * the tick state in themselves, forcing a full re-render of the whole row/table every 30s. */
export function TickingText({
  intervalMs,
  format,
}: {
  intervalMs: number
  format: () => ReactNode
}) {
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return <>{format()}</>
}
