export type OrderStatusColors = { badge: string; solid: string; ring: string; color: string }

/** The full curated, admin-pickable color palette for order statuses. Written out as literal
 * class strings (not built via template interpolation) so Tailwind's build-time class scanner
 * can find them — the same constraint that keeps ORDER_STATUS_ICON_KEYS a curated list rather
 * than free text. 6 keys reuse shared theme tokens (so the original 8 statuses keep their exact
 * pre-picker look); 5 are order-status-only tokens; 12 are spare "slot" colors for anything
 * else — 18 choices total. */
const ORDER_STATUS_COLOR_MAP = {
  muted: {
    badge: "bg-secondary text-secondary-foreground",
    solid: "bg-border",
    ring: "group-hover/statcard:ring-foreground/15",
    color: "var(--color-muted-foreground)",
  },
  info: {
    badge: "bg-status-info/10 text-status-info dark:bg-status-info/20",
    solid: "bg-status-info",
    ring: "group-hover/statcard:ring-status-info/30",
    color: "var(--color-status-info)",
  },
  progress: {
    badge: "bg-status-progress/10 text-status-progress dark:bg-status-progress/20",
    solid: "bg-status-progress",
    ring: "group-hover/statcard:ring-status-progress/30",
    color: "var(--color-status-progress)",
  },
  ready: {
    badge: "bg-status-ready/10 text-status-ready dark:bg-status-ready/20",
    solid: "bg-status-ready",
    ring: "group-hover/statcard:ring-status-ready/30",
    color: "var(--color-status-ready)",
  },
  success: {
    badge: "bg-status-success/10 text-status-success dark:bg-status-success/20",
    solid: "bg-status-success",
    ring: "group-hover/statcard:ring-status-success/30",
    color: "var(--color-status-success)",
  },
  destructive: {
    badge: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    solid: "bg-destructive",
    ring: "group-hover/statcard:ring-destructive/30",
    color: "var(--color-destructive)",
  },
  trace: {
    badge: "bg-order-status-trace/10 text-order-status-trace dark:bg-order-status-trace/20",
    solid: "bg-order-status-trace",
    ring: "group-hover/statcard:ring-order-status-trace/30",
    color: "var(--color-order-status-trace)",
  },
  cut: {
    badge: "bg-order-status-cut/10 text-order-status-cut dark:bg-order-status-cut/20",
    solid: "bg-order-status-cut",
    ring: "group-hover/statcard:ring-order-status-cut/30",
    color: "var(--color-order-status-cut)",
  },
  pack: {
    badge: "bg-order-status-pack/10 text-order-status-pack dark:bg-order-status-pack/20",
    solid: "bg-order-status-pack",
    ring: "group-hover/statcard:ring-order-status-pack/30",
    color: "var(--color-order-status-pack)",
  },
  refunded: {
    badge: "bg-order-status-refunded/10 text-order-status-refunded dark:bg-order-status-refunded/20",
    solid: "bg-order-status-refunded",
    ring: "group-hover/statcard:ring-order-status-refunded/30",
    color: "var(--color-order-status-refunded)",
  },
  returned: {
    badge: "bg-order-status-returned/10 text-order-status-returned dark:bg-order-status-returned/20",
    solid: "bg-order-status-returned",
    ring: "group-hover/statcard:ring-order-status-returned/30",
    color: "var(--color-order-status-returned)",
  },
  "slot-1": {
    badge: "bg-order-status-slot-1/10 text-order-status-slot-1 dark:bg-order-status-slot-1/20",
    solid: "bg-order-status-slot-1",
    ring: "group-hover/statcard:ring-order-status-slot-1/30",
    color: "var(--color-order-status-slot-1)",
  },
  "slot-2": {
    badge: "bg-order-status-slot-2/10 text-order-status-slot-2 dark:bg-order-status-slot-2/20",
    solid: "bg-order-status-slot-2",
    ring: "group-hover/statcard:ring-order-status-slot-2/30",
    color: "var(--color-order-status-slot-2)",
  },
  "slot-3": {
    badge: "bg-order-status-slot-3/10 text-order-status-slot-3 dark:bg-order-status-slot-3/20",
    solid: "bg-order-status-slot-3",
    ring: "group-hover/statcard:ring-order-status-slot-3/30",
    color: "var(--color-order-status-slot-3)",
  },
  "slot-4": {
    badge: "bg-order-status-slot-4/10 text-order-status-slot-4 dark:bg-order-status-slot-4/20",
    solid: "bg-order-status-slot-4",
    ring: "group-hover/statcard:ring-order-status-slot-4/30",
    color: "var(--color-order-status-slot-4)",
  },
  "slot-5": {
    badge: "bg-order-status-slot-5/10 text-order-status-slot-5 dark:bg-order-status-slot-5/20",
    solid: "bg-order-status-slot-5",
    ring: "group-hover/statcard:ring-order-status-slot-5/30",
    color: "var(--color-order-status-slot-5)",
  },
  "slot-6": {
    badge: "bg-order-status-slot-6/10 text-order-status-slot-6 dark:bg-order-status-slot-6/20",
    solid: "bg-order-status-slot-6",
    ring: "group-hover/statcard:ring-order-status-slot-6/30",
    color: "var(--color-order-status-slot-6)",
  },
  "slot-7": {
    badge: "bg-order-status-slot-7/10 text-order-status-slot-7 dark:bg-order-status-slot-7/20",
    solid: "bg-order-status-slot-7",
    ring: "group-hover/statcard:ring-order-status-slot-7/30",
    color: "var(--color-order-status-slot-7)",
  },
  "slot-8": {
    badge: "bg-order-status-slot-8/10 text-order-status-slot-8 dark:bg-order-status-slot-8/20",
    solid: "bg-order-status-slot-8",
    ring: "group-hover/statcard:ring-order-status-slot-8/30",
    color: "var(--color-order-status-slot-8)",
  },
  "slot-9": {
    badge: "bg-order-status-slot-9/10 text-order-status-slot-9 dark:bg-order-status-slot-9/20",
    solid: "bg-order-status-slot-9",
    ring: "group-hover/statcard:ring-order-status-slot-9/30",
    color: "var(--color-order-status-slot-9)",
  },
  "slot-10": {
    badge: "bg-order-status-slot-10/10 text-order-status-slot-10 dark:bg-order-status-slot-10/20",
    solid: "bg-order-status-slot-10",
    ring: "group-hover/statcard:ring-order-status-slot-10/30",
    color: "var(--color-order-status-slot-10)",
  },
  "slot-11": {
    badge: "bg-order-status-slot-11/10 text-order-status-slot-11 dark:bg-order-status-slot-11/20",
    solid: "bg-order-status-slot-11",
    ring: "group-hover/statcard:ring-order-status-slot-11/30",
    color: "var(--color-order-status-slot-11)",
  },
  "slot-12": {
    badge: "bg-order-status-slot-12/10 text-order-status-slot-12 dark:bg-order-status-slot-12/20",
    solid: "bg-order-status-slot-12",
    ring: "group-hover/statcard:ring-order-status-slot-12/30",
    color: "var(--color-order-status-slot-12)",
  },
} as const satisfies Record<string, OrderStatusColors>

export const ORDER_STATUS_COLOR_KEYS = Object.keys(ORDER_STATUS_COLOR_MAP) as OrderStatusColorKey[]

export type OrderStatusColorKey = keyof typeof ORDER_STATUS_COLOR_MAP

/** Looks up a color key's classes, falling back to the first slot for an unrecognized/legacy
 * key (the backend stores `color` as opaque, unvalidated text, same as `icon`). */
export function getOrderStatusColors(key: string): OrderStatusColors {
  return ORDER_STATUS_COLOR_MAP[key as OrderStatusColorKey] ?? ORDER_STATUS_COLOR_MAP["slot-1"]
}
