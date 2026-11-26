import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, ChevronRightIcon, MapPinIcon, SearchIcon } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import {
  formatLocation,
  searchKey,
  usePhProvince,
  usePhProvinces,
  type ShippingAddressParts,
} from "@/lib/ph-address"
import { cn } from "@/lib/utils"

export type AddressLocation = Pick<ShippingAddressParts, "province" | "city" | "barangay">

type Step = "province" | "city" | "barangay"
type Option = { key: string; label: string; hint?: string; select: () => void }

const STEPS: { step: Step; label: string }[] = [
  { step: "province", label: "Province" },
  { step: "city", label: "City" },
  { step: "barangay", label: "Barangay" },
]
const MAX_OPTIONS = 200

/**
 * SPX-style location field: one trigger showing "North Luzon / Bataan / Morong / Poblacion", and a popup that
 * walks Province → City → Barangay with a search box. The SPX zone (North Luzon etc.) follows from the
 * province, so it's shown but never picked. At the province step the search also finds cities/municipalities
 * ("Morong — Bataan"), which jumps straight to that city's barangays, and a zone name lists its provinces.
 */
export function AddressLocationPicker({
  id,
  value,
  onChange,
  invalid = false,
}: {
  id?: string
  value: AddressLocation
  onChange: (value: AddressLocation) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("province")
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { provinces, error } = usePhProvinces()
  const provinceData = usePhProvince(value.province)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setStep(!value.province ? "province" : !value.city ? "city" : "barangay")
      search("")
    }
  }

  function search(next: string) {
    setQuery(next)
    setHighlight(0)
  }

  function goTo(next: Step) {
    setStep(next)
    search("")
    searchRef.current?.focus()
  }

  const options = useMemo<Option[]>(() => {
    const q = searchKey(query)
    const matches = (label: string) => !q || searchKey(label).includes(q)
    if (step === "province") {
      if (!provinces) return []
      const provinceOptions = provinces
        .filter((p) => matches(p.name) || matches(p.zone))
        .map<Option>((p) => ({
          key: `p:${p.name}`,
          label: p.name,
          hint: p.zone === p.name ? undefined : p.zone,
          select: () => {
            onChange({ province: p.name, city: "", barangay: "" })
            goTo("city")
          },
        }))
      const cityOptions =
        q.length >= 2
          ? provinces.flatMap((p) =>
              p.cities
                .filter((city) => searchKey(city).includes(q))
                .map<Option>((city) => ({
                  key: `c:${p.name}:${city}`,
                  label: city,
                  hint: p.name,
                  select: () => {
                    onChange({ province: p.name, city, barangay: "" })
                    goTo("barangay")
                  },
                }))
            )
          : []
      return [...provinceOptions, ...cityOptions]
    }
    if (step === "city") {
      const cities = provinces?.find((p) => p.name === value.province)?.cities ?? []
      return cities.filter(matches).map((city) => ({
        key: `c:${city}`,
        label: city,
        select: () => {
          onChange({ province: value.province, city, barangay: "" })
          goTo("barangay")
        },
      }))
    }
    const barangays = provinceData?.cities.find((c) => c.name === value.city)?.barangays ?? []
    return barangays.filter(matches).map((barangay) => ({
      key: `b:${barangay}`,
      label: barangay,
      select: () => {
        onChange({ ...value, barangay })
        setOpen(false)
      },
    }))
    // onChange/goTo are stable enough for a render-time list; recomputing on them would add nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, query, provinces, provinceData, value.province, value.city])

  const visible = options.slice(0, MAX_OPTIONS)
  const loading = !error && (!provinces || (step === "barangay" && !provinceData))

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" })
  }, [highlight])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlight((i) => Math.min(i + 1, visible.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlight((i) => Math.max(i - 1, 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      visible[highlight]?.select()
    } else if (event.key === "Backspace" && !query && step !== "province") {
      goTo(step === "barangay" ? "city" : "province")
    }
  }

  const zone = provinces?.find((p) => p.name === value.province)?.zone
  const display = formatLocation(value, zone)
  const stepValue: Record<Step, string> = { province: value.province, city: value.city, barangay: value.barangay }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        id={id}
        aria-invalid={invalid}
        className={cn(
          "flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none pointer-coarse:h-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
        )}
      >
        <MapPinIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn("min-w-0 flex-1 truncate", !display && "text-muted-foreground")}>
          {display || "Province / City / Barangay"}
        </span>
        <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-(--anchor-width) min-w-72 flex-col p-0" initialFocus={searchRef}>
        <nav aria-label="Address level" className="flex items-center gap-1 border-b px-2 py-1.5 text-xs">
          {STEPS.map(({ step: s, label }, index) => {
            const reachable = s === "province" || (s === "city" && !!value.province) || (s === "barangay" && !!value.city)
            return (
              <span key={s} className="flex min-w-0 items-center gap-1">
                {index > 0 && <ChevronRightIcon aria-hidden className="size-3 shrink-0 text-muted-foreground" />}
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(s)}
                  aria-current={step === s ? "step" : undefined}
                  className={cn(
                    "min-w-0 truncate rounded px-1.5 py-0.5 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40",
                    step === s ? "bg-accent font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {stepValue[s] || label}
                </button>
              </span>
            )
          })}
        </nav>
        <div className="relative border-b">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => search(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              step === "province" ? "Search province or city" : step === "city" ? "Search city / municipality" : "Search barangay"
            }
            aria-label="Search"
            className="h-9 w-full bg-transparent pr-2.5 pl-8 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          />
        </div>
        <div ref={listRef} role="listbox" aria-label={STEPS.find((s) => s.step === step)?.label} className="max-h-72 overflow-y-auto p-1">
          {error ? (
            <p className="px-2.5 py-4 text-center text-sm text-muted-foreground">Couldn't load the address list.</p>
          ) : loading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : visible.length === 0 ? (
            <p className="px-2.5 py-4 text-center text-sm text-muted-foreground">No matches</p>
          ) : (
            visible.map((option, index) => (
              <button
                key={option.key}
                type="button"
                role="option"
                data-index={index}
                aria-selected={index === highlight}
                onMouseMove={() => setHighlight(index)}
                onClick={option.select}
                className={cn(
                  "flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none",
                  index === highlight && "bg-accent text-accent-foreground"
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.hint && <span className="shrink-0 text-xs text-muted-foreground">{option.hint}</span>}
              </button>
            ))
          )}
          {options.length > MAX_OPTIONS && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Type to narrow down {options.length} results</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
