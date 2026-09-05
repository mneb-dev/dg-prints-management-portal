import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export type OrderFormSection = {
  id: string
  label: string
}

// Mirrors the active-state treatment of the app's own sidebar nav (see app-sidebar.tsx):
// a tinted background plus a thin primary-colored left indicator, so "current section" reads
// the same way here as it does in the main nav rather than inventing a new convention.
export function OrderFormSectionNav({ sections }: { sections: OrderFormSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id)

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
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
  }, [sections])

  return (
    <nav aria-label="Order form sections" className="hidden lg:block">
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
                  "relative block rounded-md py-1.5 pr-2 pl-3 text-sm transition-colors",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground after:absolute after:inset-y-1.5 after:left-0 after:w-0.5 after:rounded-full after:bg-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {section.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
