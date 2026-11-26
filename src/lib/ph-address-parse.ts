import {
  EMPTY_SHIPPING_PARTS,
  loadPhProvince,
  loadPhProvinces,
  searchKey,
  type PhProvince,
  type PhProvinceSummary,
  type ShippingAddressParts,
} from "@/lib/ph-address"

// "Paste & Autofill" for the order form's delivery section, modelled on SPX Express's: one pasted line
// ("Juan Dela Cruz 09171234567 Blk 5 Mabini St., Brgy. Poblacion, Morong, Bataan 2108") is split into
// recipient name, phone, detail address, Province / City / Barangay and ZIP. Matching is local, against SPX's
// own location data in public/ph-address. Unlike SPX, a level that can't be matched with confidence is left
// empty (and `uncertain` set) rather than guessed — SPX turned "diliman qc" into Makati. A missing ZIP is
// filled from SPX's postal code for the town.

export type AutofillResult = {
  name: string
  phone: string
  parts: ShippingAddressParts
  /** Some location level is missing or was ambiguous — the form asks the user to check it. */
  uncertain: boolean
}

export type AddressData = {
  provinces: PhProvinceSummary[]
  loadProvince: (name: string) => Promise<PhProvince | null>
}

// Applied to both pasted text and place names, so "Sta. Cruz" meets "Santa Cruz" and "QC" meets "Quezon City".
const ALIASES: Record<string, string[]> = {
  brgy: ["barangay"],
  bgy: ["barangay"],
  bgry: ["barangay"],
  brg: ["barangay"],
  sta: ["santa"],
  sto: ["santo"],
  gen: ["general"],
  pob: ["poblacion"],
  qc: ["quezon", "city"],
  ncr: ["metro", "manila"],
}

function words(value: string): string[] {
  return searchKey(value)
    .split(" ")
    .filter(Boolean)
    .flatMap((word) => ALIASES[word] ?? [word])
}

const PHONE = /(?:\+?63|0)[\s-]*9\d{2}[\s-]*\d{3}[\s-]*\d{4}(?!\d)/

type Token = { start: number; end: number }
type Span = { start: number; end: number } // word indices, end exclusive
type PlaceMatch = Span & { value: string; province: string; keyLength: number }

// SPX's province names that people write differently: today's official names and everyday shorthands.
// Province matches inside a longer match are dropped below, so "Samar" doesn't fire inside "Eastern Samar".
const PROVINCE_TEXT_ALIASES: Record<string, string[]> = {
  "Metro Manila": ["Manila", "NCR"],
  "North Cotabato": ["Cotabato"],
  "Compostela Valley": ["Davao de Oro"],
  "Western Samar": ["Samar"],
  Maguindanao: ["Maguindanao del Norte", "Maguindanao del Sur"],
}

function provinceVariants(province: string): string[][] {
  return [province, ...(PROVINCE_TEXT_ALIASES[province] ?? [])].map(words)
}

/**
 * Every place-name variant that may appear in text: "Balanga City" → also "City of Balanga", "Balanga";
 * "Tondo I / Ii" → also "Tondo"; "Licuan (Baay)" → also "Licuan".
 */
function cityVariants(city: string, provinceKeys: Set<string>): string[][] {
  const full = words(city)
  const variants = [full]
  const withoutParens = city.replace(/\s*\([^)]*\)\s*/g, " ").trim()
  if (withoutParens !== city) variants.push(words(withoutParens))
  const withoutNumerals = city.replace(/(\s+[IVX]+)+(\s*\/\s*[IVX]+)*$/i, "").trim()
  if (withoutNumerals !== city && withoutNumerals) variants.push(words(withoutNumerals))
  const cityName = /^(.+) City$/.exec(city)
  if (cityName) {
    variants.push(words(`City of ${cityName[1]}`))
    const bare = words(cityName[1])
    // "Quezon City" → "Quezon" would also be the province; only the full name counts there.
    if (!provinceKeys.has(bare.join(" "))) variants.push(bare)
  }
  return variants
}

function barangayVariants(barangay: string): string[][] {
  const variants = [words(barangay)]
  const withoutParens = barangay.replace(/\s*\([^)]*\)\s*/g, " ").trim()
  if (withoutParens !== barangay) variants.push(words(withoutParens))
  return variants.filter((variant) => variant.length > 0)
}

function findSpans(haystack: string[], needle: string[]): Span[] {
  const spans: Span[] = []
  if (needle.length === 0) return spans
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((word, j) => haystack[i + j] === word)) spans.push({ start: i, end: i + needle.length })
  }
  return spans
}

const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end
const contains = (outer: Span, inner: Span) => outer.start <= inner.start && inner.end <= outer.end

/** "j.p. rizal" → "J.P. Rizal". */
function titleCase(value: string): string {
  return value.replace(/\S+/g, (word) => word.replace(/(^|\.)([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase()))
}

/** True when the text was typed all in lowercase (words with digits, like "3B", don't count). */
const isAllLowercase = (value: string) => !/[A-Z]/.test(value.replace(/\S*\d\S*/g, ""))

const DETAIL_ABBREVIATIONS: Record<string, string> = {
  blk: "Block",
  bldg: "Building",
  ave: "Avenue",
  rd: "Road",
  subd: "Subdivision",
  hwy: "Highway",
}

/** "blk 5 lot 12 mabini st." → "Block 5 Lot 12 Mabini Street", like SPX. Typed casing is kept if any. */
function tidyDetail(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").replace(/^[\s,;.-]+|[\s,;-]+$/g, "")
  const expanded = cleaned.replace(/\b([A-Za-z]+)\.?(?=[\s,]|$)/g, (match, word: string, offset: number, all: string) => {
    const lower = word.toLowerCase()
    if (DETAIL_ABBREVIATIONS[lower]) return DETAIL_ABBREVIATIONS[lower]
    // "St." means Street only at the end of a part ("Mabini St., ..."), not "St. Jude".
    const rest = all.slice(offset + match.length)
    if (lower === "st" && /^\s*(,|$)/.test(rest)) return "Street"
    return match
  })
  return isAllLowercase(cleaned) ? titleCase(expanded) : expanded
}

function looksLikeName(value: string): boolean {
  const trimmed = value.trim()
  return !!trimmed && trimmed.length <= 60 && !/\d/.test(trimmed) && trimmed.split(/\s+/).length <= 6
}

const trimSeparators = (value: string) => value.replace(/^[\s,;:|/-]+|[\s,;:|/-]+$/g, "")

/** Splits off the phone and recipient name; what's left is the address text. */
function splitContact(text: string): { name: string; phone: string; addressText: string } {
  const phoneMatch = PHONE.exec(text)
  let name = ""
  let phone = ""
  let addressText = text
  if (phoneMatch) {
    phone = `0${phoneMatch[0].replace(/\D/g, "").slice(-10)}`
    const before = trimSeparators(text.slice(0, phoneMatch.index))
    const after = trimSeparators(text.slice(phoneMatch.index + phoneMatch[0].length))
    const beforeLines = before.split(/\n/).map(trimSeparators).filter(Boolean)
    if (looksLikeName(before)) {
      name = before
      addressText = after
    } else if (beforeLines.length > 1 && looksLikeName(beforeLines[0])) {
      name = beforeLines[0]
      addressText = `${beforeLines.slice(1).join(", ")}, ${after}`
    } else {
      addressText = [before, after].filter(Boolean).join(", ")
    }
  } else {
    const lines = text.split(/\n/).map(trimSeparators).filter(Boolean)
    if (lines.length > 1 && looksLikeName(lines[0])) {
      name = lines[0]
      addressText = lines.slice(1).join(", ")
    }
  }
  name = name.replace(/\s+/g, " ")
  return { name: isAllLowercase(name) ? titleCase(name) : name, phone, addressText: addressText.replace(/\n/g, ", ") }
}

export async function parseShippingText(text: string, data: AddressData): Promise<AutofillResult> {
  const { name, phone, addressText } = splitContact(text.trim())
  const result: AutofillResult = { name, phone, parts: { ...EMPTY_SHIPPING_PARTS }, uncertain: true }
  if (!addressText.trim()) return result

  // Tokens keep their character offsets so the detail address can be cut from the original text.
  const tokens: Token[] = []
  const haystack: string[] = []
  const tokenOfWord: number[] = []
  for (const match of addressText.matchAll(/[^\s,;]+/g)) {
    const tokenIndex = tokens.push({ start: match.index!, end: match.index! + match[0].length }) - 1
    for (const word of words(match[0])) {
      haystack.push(word)
      tokenOfWord.push(tokenIndex)
    }
  }

  const provinceKeys = new Set(data.provinces.map((p) => words(p.name).join(" ")))
  const provinceMatches: PlaceMatch[] = []
  const cityMatches: PlaceMatch[] = []
  for (const province of data.provinces) {
    for (const key of provinceVariants(province.name)) {
      for (const span of findSpans(haystack, key)) {
        provinceMatches.push({ ...span, value: province.name, province: province.name, keyLength: key.length })
      }
    }
    for (const city of province.cities) {
      for (const variant of cityVariants(city, provinceKeys)) {
        for (const span of findSpans(haystack, variant)) {
          cityMatches.push({ ...span, value: city, province: province.name, keyLength: variant.length })
        }
      }
    }
  }
  // "Quezon" inside "Quezon City" is the city, not the province; "Samar" inside "Eastern Samar" is Eastern Samar.
  const provinces = provinceMatches.filter(
    (p) =>
      !cityMatches.some((c) => c.keyLength > p.keyLength && contains(c, p)) &&
      !provinceMatches.some((q) => q.keyLength > p.keyLength && contains(q, p))
  )

  // Best city: one whose province is also named (after it, ideally), then the rightmost, then the longest name.
  const scored = cityMatches
    .map((city) => {
      const sameProvince = provinces.filter((p) => p.province === city.province && !overlaps(p, city))
      const provinceScore = sameProvince.some((p) => p.start >= city.end) ? 2 : sameProvince.length ? 1 : 0
      return { city, score: [provinceScore, city.end, city.keyLength] as const }
    })
    .sort((a, b) => b.score[0] - a.score[0] || b.score[1] - a.score[1] || b.score[2] - a.score[2])
  const best = scored[0]
  const tied = best
    ? scored.filter((s) => s.score.every((value, i) => value === best.score[i]))
    : []
  const tiedPlaces = new Set(tied.map((s) => `${s.city.province}|${s.city.value}`))

  const provinceFor = (city: PlaceMatch) =>
    provinces.find((p) => p.province === city.province && !overlaps(p, city)) ?? null

  // Barangay: within a city, nearest before it; one marked "Brgy." wins. Two equally good names → ambiguous.
  async function matchBarangay(city: PlaceMatch) {
    const cityData = (await data.loadProvince(city.province))?.cities.find((c) => c.name === city.value)
    const taken = [city, provinceFor(city)].filter((m): m is PlaceMatch => !!m)
    const candidates: (PlaceMatch & { marked: boolean })[] = []
    for (const name of cityData?.barangays ?? []) {
      for (const variant of barangayVariants(name)) {
        for (const span of findSpans(haystack, variant)) {
          if (taken.some((t) => overlaps(t, span))) continue
          const marked = span.start > 0 && haystack[span.start - 1] === "barangay"
          candidates.push({ ...span, value: name, province: city.province, keyLength: variant.length, marked })
        }
      }
    }
    candidates.sort((a, b) => Number(b.marked) - Number(a.marked) || b.end - a.end || b.keyLength - a.keyLength)
    const top = candidates[0]
    if (!top) return { match: null, ambiguous: false }
    const rival = candidates.some(
      (c) => c.marked === top.marked && c.end === top.end && c.keyLength === top.keyLength && c.value !== top.value
    )
    return rival ? { match: null, ambiguous: true } : { match: top, ambiguous: false }
  }

  let city: PlaceMatch | null = null
  let province: PlaceMatch | null = null
  let barangayResult: Awaited<ReturnType<typeof matchBarangay>> = { match: null, ambiguous: false }
  let ambiguous = false
  if (best && tiedPlaces.size === 1) {
    city = best.city
    barangayResult = await matchBarangay(city)
  } else if (tiedPlaces.size > 1) {
    // Same-named towns ("Morong" — Bataan or Rizal?): a barangay found in only one of them settles it.
    const options = [...new Map(tied.map((s) => [`${s.city.province}|${s.city.value}`, s.city])).values()]
    const withBarangay = (
      await Promise.all(options.map(async (option) => ({ option, result: await matchBarangay(option) })))
    ).filter(({ result }) => result.match)
    if (withBarangay.length === 1) {
      city = withBarangay[0].option
      barangayResult = withBarangay[0].result
    } else {
      ambiguous = true
    }
  }
  if (city) {
    province = provinceFor(city)
  } else if (new Set(provinces.map((p) => p.province)).size === 1) {
    province = provinces[provinces.length - 1]
  }
  const barangay = barangayResult.match
  const barangayMarker = barangay?.marked ? barangay.start - 1 : -1
  if (barangayResult.ambiguous) ambiguous = true
  // "Morong, Tawi-Tawi": the city was matched elsewhere (Bataan), so the text's own province disagrees.
  // Only provinces named after the city count — an earlier one is usually a street ("Rizal St").
  // The same words can name two provinces ("Cotabato": SPX's Cotabato and North Cotabato) — that's no
  // conflict when one of them is the city's.
  const chosenCity = city
  const agrees = (p: PlaceMatch) =>
    provinces.some((q) => q.start === p.start && q.end === p.end && q.province === chosenCity?.province)
  if (chosenCity && provinces.some((p) => p.start >= chosenCity.end && p.province !== chosenCity.province && !agrees(p))) {
    ambiguous = true
  }

  // Detail address: everything before the first recognised place (and its "Brgy." marker).
  const placeStarts = [barangay, city, province]
    .filter((m): m is PlaceMatch => !!m)
    .map((m) => m.start)
  if (barangayMarker >= 0) placeStarts.push(barangayMarker)
  const firstPlaceWord = placeStarts.length ? Math.min(...placeStarts) : -1
  const firstPlaceToken = firstPlaceWord >= 0 ? tokenOfWord[firstPlaceWord] : tokens.length

  // ZIP: a 4-digit token in the location part (or the very last token when nothing was recognised).
  let zip = ""
  let zipToken = -1
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = addressText.slice(tokens[i].start, tokens[i].end).replace(/[.]$/, "")
    if (/^\d{4}$/.test(token) && (i >= firstPlaceToken || i === tokens.length - 1)) {
      zip = token
      zipToken = i
      break
    }
  }

  const detailEndToken = Math.min(firstPlaceToken, zipToken >= 0 ? zipToken : tokens.length)
  const detailEnd = detailEndToken < tokens.length ? tokens[detailEndToken].start : addressText.length
  const detail = tidyDetail(addressText.slice(0, detailEnd))

  // No ZIP in the text: use SPX's postal code for the town.
  const chosen = city
  if (!zip && chosen) {
    zip = (await data.loadProvince(chosen.province))?.cities.find((c) => c.name === chosen.value)?.postal ?? ""
  }

  result.parts = {
    detail,
    barangay: barangay?.value ?? "",
    city: city?.value ?? "",
    province: city?.province ?? province?.province ?? "",
    zip,
  }
  result.uncertain = ambiguous || !barangay || !city || !detail
  return result
}

/** Autofill against the bundled PSGC data (loads it on first use). */
export async function autofillShipping(text: string): Promise<AutofillResult> {
  return parseShippingText(text, { provinces: await loadPhProvinces(), loadProvince: loadPhProvince })
}
