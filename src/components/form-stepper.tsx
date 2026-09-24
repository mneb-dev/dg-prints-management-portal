import { Fragment } from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Horizontal step indicator for stepped form dialogs (docs/design-system.md → Stepped form
 * dialogs). Numbered circles turn into checks once a step is complete; a step is clickable only
 * when `canNavigate(index)` allows it. Labels collapse below `sm` — the dialog header carries the
 * "Step X of N" line there. */
export function FormStepper({
  steps,
  current,
  completed,
  canNavigate,
  onStepClick,
  className,
}: {
  steps: { title: string }[]
  current: number
  completed: ReadonlySet<number>
  canNavigate: (index: number) => boolean
  onStepClick: (index: number) => void
  className?: string
}) {
  return (
    <ol aria-label="Form steps" className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => {
        const isCurrent = index === current
        const isDone = completed.has(index) && !isCurrent
        const clickable = !isCurrent && canNavigate(index)
        return (
          <Fragment key={step.title}>
            {index > 0 && (
              <li
                aria-hidden
                className={cn(
                  "h-px min-w-4 flex-1 rounded-full transition-colors duration-200",
                  index <= current ? "bg-primary/60" : "bg-border"
                )}
              />
            )}
            <li className="shrink-0">
              <button
                type="button"
                onClick={() => onStepClick(index)}
                disabled={!clickable}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${step.title}${isDone ? " (complete)" : ""}`}
                className={cn(
                  "group flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 text-sm outline-none transition-colors duration-150",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  clickable ? "cursor-pointer hover:bg-accent/60" : "cursor-default"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-200",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isDone
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <CheckIcon className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden leading-none sm:inline",
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
