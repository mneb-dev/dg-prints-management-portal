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

### Applies to every status chip — editable or read-only

The same neutral chrome + dot is used for **every** order and payment status chip, whether it's a
dropdown trigger (`OrderStatusMenu`, `PaymentStatusMenu`, `PaymentFields`' Payment Status) or a
read-only badge (`OrderStatusBadge`, `PaymentStatusBadge`) — so a status looks identical whether or
not the viewer can change it; only the chevron differs. Destructive-ish options (Cancelled for order
status, Refunded for payment) sit below a `DropdownMenuSeparator`.

Payment status dot colors (`STATUS_DOT_CLASSES` in `payment-status-badge.tsx`):

| Status   | Dot                      | Hue |
| -------- | ------------------------ | --- |
| Unpaid   | `bg-order-status-gold`   | 62  |
| Partial  | `bg-order-status-violet` | 295 |
| Paid     | `bg-order-status-teal`   | 165 |
| Refunded | `bg-order-status-rose`   | 350 |

These come from the brand-tuned order-status palette rather than the generic `status-*` tokens, and
mirror the chart palette that pairs with the indigo primary (teal ≈ chart-4, gold ≈ chart-5, violet
≈ chart-2). Violet is the brand's secondary hue, so "in progress" reads on-brand; rose marks a
refund without borrowing the destructive red used for app errors. The four hues are ~60–130° apart,
so the dots stay distinguishable at `size-2` in both themes.

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

## Clickable stat tiles (dashboard status tiles)

`StatCard` with `onClick`/`href` follows the same "neutral chrome + dot" rule on hover:

- Tile: lifts `-translate-y-1` with `--shadow-elevated`, `border-primary/40`, and a
  `bg-accent/60` wash — brand indigo only, never the status's own color.
- Dot: scales to 125% and gains a `ring-4` halo in the status's `ring` class (from
  `getOrderStatusColors`), so the dot stays the only thing that carries the status color.
- Label: `text-muted-foreground` → `text-foreground`.
- Press: `scale-[0.98]`, back at rest with `--shadow-soft`. Keyboard focus:
  `border-ring ring-3 ring-ring/50`, same as Buttons/Inputs.
- 200ms `ease-out`. Under `motion-reduce` only the movement (lift/scale) is dropped; the color
  and shadow feedback stays, otherwise the hover is nearly invisible.
- Tailwind v4 `translate-*`/`scale-*` utilities set the `translate`/`scale` CSS properties, not
  `transform` — list those in `transition-[...]`, or the movement snaps instead of easing.

## Pagination (`components/pagination-bar.tsx`)

Every list that grows without bound is paged **server-side** (`page`/`pageSize` in, `total` out;
page sizes 5/10/20/50 on both sides). Small, bounded lists (settings catalogs, tiers, per-staff
tables, the ≤12-month incentive history) aren't paged.

- **Placement: a footer strip inside the table surface**, never floating below it. Tables take a
  `footer?: ReactNode` prop, rendered right after `</Table>` inside `TABLE_SURFACE_CLASS` (or the
  `Card` for the commission table) and only in the data state, not loading/empty/error. Pages
  pass `footer={total > 0 && <PaginationBar … />}`.
- **Strip:** `border-t bg-muted/40 px-4 py-2`, the same tint as the table header and modal
  footers. The surface's `overflow-hidden` supplies the rounded corners.
- **Left:** "Showing **1–10** of 124 orders" (range in `text-foreground`, `tabular-nums`) and the
  rows-per-page `Select`.
- **Right:** First · Prev · numbered pages · Next · Last. Page numbers sit on the shared segmented
  track (`SEGMENT_TRACK_CLASS` / `SEGMENT_CLASS`): the current page takes the accent + ring
  treatment with `aria-current="page"`, not a solid fill.
- **Ellipsis rule** (`getPageItems` in `lib/pagination.ts`): always the first and last page plus
  one neighbour either side of the current page. A gap of exactly one page shows that number,
  since an ellipsis there would hide nothing.
- **Phones (below `sm`):** the track and First/Last hide, leaving `‹ Page 3 of 12 ›` with 44px
  tap targets. The summary shortens to "1–10 of 124".
- **Staying in range:** `useClampPage` pulls the page back to the last one when a mutation empties
  the current page (e.g. deleting the only row on the last page). Filter changes reset to page 1.

## Modals

Every modal in the app follows one pattern. Two shapes share the same surface.

### Surface (`ui/alert-dialog.tsx`, `ui/dialog.tsx`)

- Backdrop `bg-foreground/25` + `backdrop-blur-sm` (`dark:bg-black/50`), fading in over 200ms.
- Popup `rounded-2xl border bg-popover shadow-[var(--shadow-elevated)]`, entering with
  `fade-in-0 zoom-in-95 slide-in-from-bottom-2` (200ms ease-out) and leaving in 150ms. There's no
  motion under `motion-reduce`.
- Footer: a tinted strip (`bg-muted/40 border-t`). The primary action sits on the right. On mobile
  the buttons stack full width, with the primary on top.
- Form dialogs are capped at `85vh`. A `<form>` (or `DialogBody`) between the header and footer is
  the only part that scrolls, so the title and buttons stay visible.

### Confirmations: `ConfirmDialog` (`components/confirm-dialog.tsx`)

Never hand-build an `AlertDialog`. Every "are you sure?" goes through `ConfirmDialog`.

- **The title is a question** that names the thing: "Cancel order ORD-042?". Wrap the name in
  `<Name>`.
- **The buttons answer it, briefly**: confirm is the **verb** ("Delete", "Refund", "Save"), dismiss
  is **"Keep"** (the default). Where "Keep" doesn't fit, use "Back", "Stay", "Later" or "Keep
  editing". Never put two "Cancel"s side by side, so the cancel-order modal says "Cancel order" /
  "Keep".
- **The description** is one or two short sentences stating the consequence ("This can't be
  undone.").
- **`tone`** sets the round icon tile and the confirm button:
  - `danger`: red tile, solid red confirm, **focus starts on the dismiss button** so Enter never destroys.
  - `warning`: amber tile, primary confirm.
  - `primary`: indigo tile, primary confirm.
- A pending state shows a spinner and a `pendingLabel` ("Deleting…"), disables both buttons and
  blocks closing.
- Richer confirmations (record payment, OR request, arrange shipment) pass their fields or details
  as `children`. A third choice ("Save draft") uses `secondaryAction`. A result step ("Password
  reset") sets `cancelLabel={null}` and a single "Done".

### Form dialogs: `FormDialogHeader` (`components/form-dialog-header.tsx`)

- The header uses the same IconBadge + title + one-line description as the section headers. Titles
  are sentence case: "New product", "Edit expense".
- The footer has a ghost **"Cancel"** (a form isn't a question) and a specific primary verb:
  "Create product" when new, "Save changes" when editing, and "Saving…" while submitting.

### Stepped form dialogs: `FormStepper` (`components/form-stepper.tsx`)

For forms that are too much for one screen (the product form: Details → Pricing → Review), show one
concern per step instead of stacking numbered `FormSection`s.

- The stepper sits between the header and the scrolling form. It shows numbered circles, which turn
  into checks once a step is complete, joined by connector lines. Labels hide below `sm`, where the
  header description carries "Step 2 of 3 · Pricing".
- **Creating** walks forward: the primary button is "Next" until the last step, which says "Create
  product". Enter does the same. You can only jump back to steps you've already reached.
- **Editing** lets you click any step, and "Save changes" is the primary button on every step,
  with an outline "Next" beside it.
- Moving forward validates the steps being left and stops on the first bad one, focusing its field.
  Saving validates every step.
- "Back" is an outline button next to the primary. "Cancel" is a ghost button on the far left.
- The last step is a **Review** with a summary card whose rows each have an "Edit" link back to their
  step, followed by the on/off settings as switch rows.
- Closing a changed form asks first, with a warning `ConfirmDialog`: "Discard changes?" with
  "Discard" / "Keep editing".

## Dark mode

Light, Dark or System (follows the OS live), picked from the sun/moon/monitor button in the top bar
(`components/theme-toggle.tsx`, also on the login page) and stored under `dgprints_theme`. The
pre-paint script in `index.html` applies `.dark` before React mounts, so there's no flash.

- **Tokens only.** Every color comes from a token that `.dark` in `index.css` redefines. Never use a
  raw palette color (`bg-white`, `text-slate-*`). When a surface genuinely needs a different
  treatment in the dark, add a `dark:` variant next to the light class and leave the light class
  untouched.
- **Surface ladder:** background → card → popover → secondary/muted, each a step lighter, so menus
  and dialogs separate from the cards beneath them without relying on shadow.
- **Elevation:** in the dark, `--shadow-soft` and `--shadow-elevated` are black depth plus a faint
  1px top-lit hairline. The brand-tinted glow reads as neon on a dark ground, so only CTAs
  (`--shadow-button`) keep a softer brand glow. Always consume shadows as
  `shadow-[var(--shadow-*)]`, never as a hard-coded value.
- **Tinted chips:** `bg-<token>/10` in light, `dark:bg-<token>/20` in dark (see
  `ORDER_STATUS_COLOR_MAP`, `badge.tsx`).
- **White text on colored fills:** the dark-tuned status/order-status fills are light, so white
  text fails there. Flip it with `dark:text-background` (see `rank-badge.ts`).
- **Primary buttons** keep near-black text on the lighter dark-mode indigo. Lowering primary enough
  for white text would make `text-primary` links and icons too dim on the dark background.
- **Logo:** `Logo` renders both `dg-prints-logo.png` and `dg-prints-logo-dark.png` (white "PRINTS"
  wordmark) and lets `dark:` pick one.
