/** Rank-badge treatment shared by dashboard ranked lists (top customers, hot products) —
 * gold/silver/bronze-style coloring for the top 3. Ranks past this list fall back to plain
 * muted text at the call site (no badge). */
export const RANK_BADGE_CLASSES = [
  "bg-status-warning text-white shadow-[var(--shadow-button)]",
  "bg-muted-foreground/70 text-white",
  "bg-order-status-tangerine text-white",
] as const
