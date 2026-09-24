/** Rank-badge treatment shared by dashboard ranked lists (top customers, hot products) —
 * gold/silver/bronze-style coloring for the top 3. Ranks past this list fall back to plain
 * muted text at the call site (no badge). Dark mode flips the digit to the page background, since the
 * dark-tuned fills are too light for white text. */
export const RANK_BADGE_CLASSES = [
  "bg-status-warning text-white shadow-[var(--shadow-button)] dark:text-background",
  "bg-muted-foreground/70 text-white dark:text-background",
  "bg-order-status-tangerine text-white dark:text-background",
] as const
