export type OrderStatusColors = { badge: string; solid: string; ring: string; color: string }

/** The full curated, admin-pickable color palette for order statuses. Written out as literal
 * class strings (not built via template interpolation) so Tailwind's build-time class scanner
 * can find them — the same constraint that keeps ORDER_STATUS_ICON_KEYS a curated list rather
 * than free text. 6 keys reuse shared theme tokens (so status flows that lean on the generic
 * info/progress/ready/success/destructive language keep using them); 18 are dedicated,
 * named order-status colors — 24 choices total, all tuned to complement the indigo/violet
 * "Corporate Trust" brand palette while staying mutually distinguishable. */
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
  crimson: {
    badge: "bg-order-status-crimson/10 text-order-status-crimson dark:bg-order-status-crimson/20",
    solid: "bg-order-status-crimson",
    ring: "group-hover/statcard:ring-order-status-crimson/30",
    color: "var(--color-order-status-crimson)",
  },
  tangerine: {
    badge:
      "bg-order-status-tangerine/10 text-order-status-tangerine dark:bg-order-status-tangerine/20",
    solid: "bg-order-status-tangerine",
    ring: "group-hover/statcard:ring-order-status-tangerine/30",
    color: "var(--color-order-status-tangerine)",
  },
  gold: {
    badge: "bg-order-status-gold/10 text-order-status-gold dark:bg-order-status-gold/20",
    solid: "bg-order-status-gold",
    ring: "group-hover/statcard:ring-order-status-gold/30",
    color: "var(--color-order-status-gold)",
  },
  citrine: {
    badge: "bg-order-status-citrine/10 text-order-status-citrine dark:bg-order-status-citrine/20",
    solid: "bg-order-status-citrine",
    ring: "group-hover/statcard:ring-order-status-citrine/30",
    color: "var(--color-order-status-citrine)",
  },
  lime: {
    badge: "bg-order-status-lime/10 text-order-status-lime dark:bg-order-status-lime/20",
    solid: "bg-order-status-lime",
    ring: "group-hover/statcard:ring-order-status-lime/30",
    color: "var(--color-order-status-lime)",
  },
  moss: {
    badge: "bg-order-status-moss/10 text-order-status-moss dark:bg-order-status-moss/20",
    solid: "bg-order-status-moss",
    ring: "group-hover/statcard:ring-order-status-moss/30",
    color: "var(--color-order-status-moss)",
  },
  jade: {
    badge: "bg-order-status-jade/10 text-order-status-jade dark:bg-order-status-jade/20",
    solid: "bg-order-status-jade",
    ring: "group-hover/statcard:ring-order-status-jade/30",
    color: "var(--color-order-status-jade)",
  },
  teal: {
    badge: "bg-order-status-teal/10 text-order-status-teal dark:bg-order-status-teal/20",
    solid: "bg-order-status-teal",
    ring: "group-hover/statcard:ring-order-status-teal/30",
    color: "var(--color-order-status-teal)",
  },
  spruce: {
    badge: "bg-order-status-spruce/10 text-order-status-spruce dark:bg-order-status-spruce/20",
    solid: "bg-order-status-spruce",
    ring: "group-hover/statcard:ring-order-status-spruce/30",
    color: "var(--color-order-status-spruce)",
  },
  cyan: {
    badge: "bg-order-status-cyan/10 text-order-status-cyan dark:bg-order-status-cyan/20",
    solid: "bg-order-status-cyan",
    ring: "group-hover/statcard:ring-order-status-cyan/30",
    color: "var(--color-order-status-cyan)",
  },
  azure: {
    badge: "bg-order-status-azure/10 text-order-status-azure dark:bg-order-status-azure/20",
    solid: "bg-order-status-azure",
    ring: "group-hover/statcard:ring-order-status-azure/30",
    color: "var(--color-order-status-azure)",
  },
  cobalt: {
    badge: "bg-order-status-cobalt/10 text-order-status-cobalt dark:bg-order-status-cobalt/20",
    solid: "bg-order-status-cobalt",
    ring: "group-hover/statcard:ring-order-status-cobalt/30",
    color: "var(--color-order-status-cobalt)",
  },
  sapphire: {
    badge:
      "bg-order-status-sapphire/10 text-order-status-sapphire dark:bg-order-status-sapphire/20",
    solid: "bg-order-status-sapphire",
    ring: "group-hover/statcard:ring-order-status-sapphire/30",
    color: "var(--color-order-status-sapphire)",
  },
  indigo: {
    badge: "bg-order-status-indigo/10 text-order-status-indigo dark:bg-order-status-indigo/20",
    solid: "bg-order-status-indigo",
    ring: "group-hover/statcard:ring-order-status-indigo/30",
    color: "var(--color-order-status-indigo)",
  },
  violet: {
    badge: "bg-order-status-violet/10 text-order-status-violet dark:bg-order-status-violet/20",
    solid: "bg-order-status-violet",
    ring: "group-hover/statcard:ring-order-status-violet/30",
    color: "var(--color-order-status-violet)",
  },
  orchid: {
    badge: "bg-order-status-orchid/10 text-order-status-orchid dark:bg-order-status-orchid/20",
    solid: "bg-order-status-orchid",
    ring: "group-hover/statcard:ring-order-status-orchid/30",
    color: "var(--color-order-status-orchid)",
  },
  magenta: {
    badge: "bg-order-status-magenta/10 text-order-status-magenta dark:bg-order-status-magenta/20",
    solid: "bg-order-status-magenta",
    ring: "group-hover/statcard:ring-order-status-magenta/30",
    color: "var(--color-order-status-magenta)",
  },
  rose: {
    badge: "bg-order-status-rose/10 text-order-status-rose dark:bg-order-status-rose/20",
    solid: "bg-order-status-rose",
    ring: "group-hover/statcard:ring-order-status-rose/30",
    color: "var(--color-order-status-rose)",
  },
} as const satisfies Record<string, OrderStatusColors>

export const ORDER_STATUS_COLOR_KEYS = Object.keys(ORDER_STATUS_COLOR_MAP) as OrderStatusColorKey[]

export type OrderStatusColorKey = keyof typeof ORDER_STATUS_COLOR_MAP

/** Looks up a color key's classes, falling back to a neutral default for an unrecognized/legacy
 * key (the backend stores `color` as opaque, unvalidated text, same as `icon`) — most likely to
 * hit for a status still carrying one of the removed `slot-N`/trace/cut/pack/refunded/returned
 * keys from before the Corporate Trust palette reset; re-pick its color from the status list to
 * clear this. */
export function getOrderStatusColors(key: string): OrderStatusColors {
  return ORDER_STATUS_COLOR_MAP[key as OrderStatusColorKey] ?? ORDER_STATUS_COLOR_MAP["muted"]
}
