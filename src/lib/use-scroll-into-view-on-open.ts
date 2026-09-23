import { useEffect, useRef, type RefObject } from "react"

/** Matches the expand animations' `duration-300` (line item cards, payment details panel). */
const EXPAND_ANIMATION_MS = 320

/** After something expands, bring it fully into view — but only as far as needed
 * (`block: "nearest"`), and only when it was actually cut off. Runs when `openKey` changes to a
 * non-null value (not on mount), after the expand animation has settled so the measurement is of
 * the final size. Reduced motion: jumps straight there with no smooth scroll or wait.
 *
 * `openKey` rather than a boolean so a panel that stays open but grows (e.g. Paid → Partial adds
 * the down-payment field) can re-trigger by changing its key. */
export function useScrollIntoViewOnOpen(ref: RefObject<HTMLElement | null>, openKey: string | null) {
  const previousKeyRef = useRef(openKey)

  useEffect(() => {
    const previousKey = previousKeyRef.current
    previousKeyRef.current = openKey
    if (openKey === null || openKey === previousKey) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const timer = window.setTimeout(
      () => ref.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" }),
      prefersReducedMotion ? 0 : EXPAND_ANIMATION_MS
    )
    return () => window.clearTimeout(timer)
  }, [openKey, ref])
}
