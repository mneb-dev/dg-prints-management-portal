import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type OrderFormSectionState = "complete" | "error" | "optional"

export type OrderFormSection = {
  id: string
  label: string
  /** Progress marker: ✓ when filled in, a red dot when it has a validation error, "optional" for
   * a section that's off (e.g. Shipping), or an empty ring when still to do (undefined). */
  state?: OrderFormSectionState
}

function SectionMarker({ state }: { state?: OrderFormSectionState }) {
  if (state === "complete") {
    return <CheckIcon aria-hidden className="size-3.5 shrink-0 stroke-3 text-status-success" />
  }
  if (state === "error") {
    return (
      <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center">
        <span className="size-2 rounded-full bg-destructive" />
      </span>
    )
  }
  return (
    <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center">
      <span className="size-2 rounded-full border border-muted-foreground/40" />
    </span>
  )
}

const STATE_LABELS: Record<OrderFormSectionState, string> = {
  complete: "complete",
  error: "has errors",
  optional: "optional",
}

// Mirrors the active-state treatment of the app's own sidebar nav (see app-sidebar.tsx):
// a tinted background plus a thin primary-colored left indicator, so "current section" reads
// the same way here as it does in the main nav rather than inventing a new convention.
export function OrderFormSectionNav({ sections }: { sections: OrderFormSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id)

  // Only the ids matter for scroll tracking — keyed on them so a state change (✓, error dot)
  // on every keystroke doesn't tear down and re-attach the scroll listeners.
  const sectionIdsKey = sections.map((section) => section.id).join("|")

  useEffect(() => {
    const elements = sectionIdsKey
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => !!element)

    if (elements.length === 0) return

    // A section (e.g. "Products") can span far more vertical space than the single anchor
    // element tagged with its id — an IntersectionObserver on just that element loses track
    // once it scrolls out, freezing the nav on a stale section. Instead, on every scroll, walk
    // the sections in order and take the last one whose top has crossed the offset line: that
    // stays correct for the whole span between it and the next section's anchor.
    const offset = 112
    let frame = 0

    function updateActive() {
      let current = elements[0]
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= offset) current = element
        else break
      }
      setActiveId(current.id)
    }

    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateActive)
    }

    updateActive()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [sectionIdsKey])

  return (
    <nav aria-label="Order form sections" className="hidden xl:block">
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => {
          const isActive = activeId === section.id
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className={cn(
                  "relative flex items-center gap-2 rounded-md py-1.5 pr-2 pl-3 text-sm transition-colors",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground after:absolute after:inset-y-1.5 after:left-0 after:w-0.5 after:rounded-full after:bg-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  section.state === "error" && !isActive && "text-destructive"
                )}
              >
                <SectionMarker state={section.state} />
                <span className="leading-none">{section.label}</span>
                {section.state === "optional" ? (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">optional</span>
                ) : null}
                {section.state ? <span className="sr-only">({STATE_LABELS[section.state]})</span> : null}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
