"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      className={cn("bg-popover p-3 text-popover-foreground", className)}
      classNames={{
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8 items-center justify-center text-sm font-medium",
          defaultClassNames.month_caption
        ),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "w-8 flex-1 text-xs font-normal text-muted-foreground",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        day: cn("relative w-8 flex-1 p-0 text-center text-sm", defaultClassNames.day),
        day_button: cn(
          "inline-flex size-8 items-center justify-center rounded-md p-0 text-sm font-normal transition-colors hover:bg-muted hover:text-foreground",
          defaultClassNames.day_button
        ),
        range_start: cn("rounded-l-md bg-accent", defaultClassNames.range_start),
        range_middle: cn("rounded-none bg-accent", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        selected: cn(
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90 [&>button]:hover:text-primary-foreground",
          defaultClassNames.selected
        ),
        today: cn(
          "[&>button]:bg-accent [&>button]:text-accent-foreground",
          defaultClassNames.today
        ),
        outside: cn("text-muted-foreground/50", defaultClassNames.outside),
        disabled: cn("text-muted-foreground/50 opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) => {
          const Icon = orientation === "left" ? ChevronLeftIcon : ChevronRightIcon
          return <Icon className={cn("size-4", chevronClassName)} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
