# Corporate Trust — Design System Addendum: Dropdown / Menu

The base "Corporate Trust" design system prompt (tokens, Buttons, Cards, Inputs) doesn't cover
dropdown/menu/popover-style surfaces. This addendum documents the pattern actually applied across
the codebase so future components stay consistent — it isn't aspirational, it's a description of
`src/components/ui/dropdown-menu.tsx`, `popover.tsx`, `select.tsx`, `combobox.tsx`, and
`autocomplete.tsx` as they exist today.

## Surface (the popup/panel itself)

All five "popup" primitives above share one recipe:

- `rounded-lg` — matches the Input radius tier (one step down from Card's `rounded-xl`), since a
  menu is closer to a form control than a content card.
- `border border-border` + `shadow-[var(--shadow-elevated)]` — the same colored-shadow tier Card
  uses on hover/active, applied at rest here because a popup is *already* in its "elevated" state
  the moment it's open. (Previously these used a flat `ring-1 ring-foreground/10` + `shadow-md`,
  which predates the token pass — retired in favor of the brand-tinted elevated shadow.)
- `bg-popover text-popover-foreground` — unchanged, already token-driven.
- Motion: `duration-100` with `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95` /
  `data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95`, plus a
  `slide-in-from-*` nudge keyed to `data-[side=...]`. Fast (100ms) and subtle — a menu should feel
  instant, not like a modal entrance.

Dialog/AlertDialog are **not** part of this pattern — a true modal sits above a backdrop and
already reads as elevated, so it keeps its own (heavier) treatment.

## Items

- `flex items-center gap-1.5`, `rounded-md`, `px-1.5 py-1`, `text-sm`.
- Hover/focus: `bg-accent text-accent-foreground` (the soft indigo tint from the token pass, not a
  solid fill).
- `variant="destructive"` (cancel/refund/return-style actions): `text-destructive`, and on
  focus `bg-destructive/10` — never a solid destructive fill inside a menu; that's reserved for
  buttons.

## Status/color signal inside a menu: neutral chrome + a dot, not a colored background

Where a menu item or trigger needs to carry a semantic color (order status, etc.), the pattern is:

- **Trigger button** (e.g. `OrderStatusMenu`'s badge): neutral `badgeVariants({variant:
  "secondary"})` chrome (`bg-secondary text-secondary-foreground`) — *not* the status's own
  tinted badge background. The only color comes from a `size-2 rounded-full` dot using that
  status's `solid` class (e.g. `bg-order-status-sapphire`).
- **Menu items**: same dot, same size, placed before the label.
- No icons in this context — status is color + text only, kept deliberately minimal (see the
  dashboard status tiles and Recent Orders badges, which dropped icons the same way).

### The one alignment gotcha

A fixed-size dot next to text, centered with plain `items-center`, optically sits a hair too high
— text's line-box includes more leading above the cap-height than below the baseline, so
flex-centering against the *line box* isn't the same as centering against the *ink*. Two things
fix it together, and both are needed:

```tsx
<span aria-hidden className="size-2 shrink-0 translate-y-px rounded-full bg-order-status-sapphire" />
<span className="leading-none">To Trace</span>
```

- `leading-none` on the label tightens its line-box to the font's actual metrics.
- `translate-y-px` (1px) on the dot is the remaining optical nudge.

Skipping either one is visible the moment you see the dot repeated down a table column — a single
isolated badge can look "close enough," but the same 1–2px offset reads as a clear misalignment
once it repeats across many rows.
