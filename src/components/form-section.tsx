import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Numbered step heading for multi-part forms ("① Basics", "② Pricing") — the product form,
 * recurring expense form and Run payroll. `action` sits on the right of the heading (e.g. a
 * "Select all"); `className` goes on the section, e.g. to place it in a grid. */
export function FormSection({
  step,
  title,
  description,
  action,
  className,
  children,
}: {
  step: number
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground tabular-nums"
        >
          {step}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm leading-6 font-semibold">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="-my-1 shrink-0">{action}</div> : null}
      </div>
      <div className="flex flex-col gap-4 sm:pl-9">{children}</div>
    </section>
  )
}
