// Builds the Region → Province → Town/City → Barangay (+ postal code) data used by the order form's address
// picker and Paste & Autofill, from SPX Express's own mass order template — so every name is spelled exactly
// as SPX expects (copied addresses and the "Export to SPX" file then match SPX's lists).
//
//   node scripts/build-ph-address.mjs                 # reads public/spx/mass_order_creation_template_ph_V2.xlsx
//   node scripts/build-ph-address.mjs <template.xlsx> # or another copy of the template
//
// The template's province_list / town_list / brgy_list / postal_list sheets line up row for row: row i of
// each is one barangay with its region (SPX zone), province, town and postal code.
//
// Writes public/ph-address/index.json (every province with its zone and town names) and one
// public/ph-address/<slug>.json per province (its towns with postal code and barangays). When SPX publishes a
// new template, replace public/spx/ with it (the export fills that same file) and re-run this.
//
// Province names must be accepted by dg-prints-management-server (phProvinces.ts lists, any case, plus its
// SPX_PROVINCE_ALIASES) — checked when that sibling repo is present.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { strFromU8, unzipSync } from "fflate"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const templatePath = process.argv[2] ?? path.join(root, "public", "spx", "mass_order_creation_template_ph_V2.xlsx")
const outDir = path.join(root, "public", "ph-address")

const files = unzipSync(fs.readFileSync(templatePath))
const read = (name) => {
  if (!files[name]) throw new Error(`${name} not found in ${templatePath}`)
  return strFromU8(files[name])
}
const unescapeXml = (s) =>
  s.replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-f]+);/gi, (m, e) =>
    e === "lt" ? "<" : e === "gt" ? ">" : e === "quot" ? '"' : e === "apos" ? "'" : e === "amp" ? "&"
      : String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  )

const sharedStrings = [...read("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  unescapeXml(m[1].replace(/<[^>]+>/g, ""))
)

// Sheet name → its XML part, via the workbook's relationships.
const rels = Object.fromEntries(
  [...read("xl/_rels/workbook.xml.rels").matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]])
)
const sheetPart = Object.fromEntries(
  [...read("xl/workbook.xml").matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((m) => [
    unescapeXml(m[1]),
    `xl/${rels[m[2]].replace(/^\/?xl\//, "")}`,
  ])
)

/** Rows of a sheet as arrays of cell text (header row dropped). */
function sheetRows(name) {
  const xml = read(sheetPart[name] ?? `missing sheet ${name}`)
  return [...xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)].slice(1).map((row) =>
    [...row[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map(([, attrs, body = ""]) => {
      const type = /\bt="(\w+)"/.exec(attrs)?.[1]
      if (type === "inlineStr") return unescapeXml(body.replace(/<[^>]+>/g, "")).trim()
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
      if (value === undefined) return ""
      return (type === "s" ? sharedStrings[Number(value)] : unescapeXml(value)).trim()
    })
  )
}

const provinceRows = sheetRows("province_list") // [region, province]
const townRows = sheetRows("town_list") // [province, town, helper]
const barangayRows = sheetRows("brgy_list") // [town, barangay]
const postalRows = sheetRows("postal_list") // [town, postal]
if (new Set([provinceRows.length, townRows.length, barangayRows.length, postalRows.length]).size !== 1) {
  throw new Error("The template's location sheets no longer have the same number of rows")
}

// province → { zone, towns: town → { postal, barangays } }
const tree = new Map()
for (let i = 0; i < provinceRows.length; i++) {
  const [zone, province] = provinceRows[i]
  const [townProvince, town] = townRows[i]
  const [barangayTown, barangay] = barangayRows[i]
  const [postalTown, postal] = postalRows[i]
  if (!province || !town || !barangay) continue
  if (townProvince !== province || barangayTown !== town || postalTown !== town) {
    throw new Error(`Location sheets out of step at row ${i + 2}: ${province} / ${town} / ${barangay}`)
  }
  if (!tree.has(province)) tree.set(province, { zone, towns: new Map() })
  const towns = tree.get(province).towns
  if (!towns.has(town)) towns.set(town, { postal: postal ?? "", barangays: new Set() })
  towns.get(town).barangays.add(barangay)
}

// Every province must be one the server accepts for orders.
const serverProvinces = path.resolve(root, "..", "dg-prints-management-server", "src", "utils", "phProvinces.ts")
if (fs.existsSync(serverProvinces)) {
  const source = fs.readFileSync(serverProvinces, "utf8")
  const lists = [...source.matchAll(/const (?:LUZON|VISAYAS|MINDANAO) = \[([\s\S]*?)\];/g)].map((m) => m[1])
  const known = new Set(lists.flatMap((list) => [...list.matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase())))
  const aliasBlock = /SPX_PROVINCE_ALIASES[^=]*=\s*\{([\s\S]*?)\};/.exec(source)?.[1] ?? ""
  for (const m of aliasBlock.matchAll(/^\s*'?([^':\n]+?)'?\s*:/gm)) known.add(m[1].trim().toLowerCase())
  const unknown = [...tree.keys()].filter((name) => !known.has(name.toLowerCase()))
  if (unknown.length) {
    throw new Error(`Provinces the server doesn't accept (add them to SPX_PROVINCE_ALIASES): ${unknown.join(", ")}`)
  }
} else {
  console.warn(`! ${serverProvinces} not found — skipped the province-name check`)
}

const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
const byName = (a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" })

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const index = []
let barangayCount = 0
for (const province of [...tree.keys()].sort(byName)) {
  const { zone, towns } = tree.get(province)
  const slug = slugify(province)
  const cities = [...towns]
    .map(([name, { postal, barangays }]) => ({ name, postal, barangays: [...barangays].sort(byName) }))
    .sort((a, b) => byName(a.name, b.name))
  barangayCount += cities.reduce((sum, city) => sum + city.barangays.length, 0)
  index.push({ name: province, slug, zone, cities: cities.map((city) => city.name) })
  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify({ name: province, cities }))
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({ provinces: index }))
console.log(
  `Wrote ${index.length} provinces, ${index.reduce((s, p) => s + p.cities.length, 0)} towns, ${barangayCount} barangays to ${path.relative(root, outDir)}`
)
