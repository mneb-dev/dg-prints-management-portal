// Builds the Province → City/Municipality → Barangay data used by the order form's address picker and
// Paste & Autofill, from the public PSGC (Philippine Standard Geographic Code) dataset.
//
//   node scripts/build-ph-address.mjs            # downloads from https://psgc.gitlab.io/api
//   node scripts/build-ph-address.mjs <dir>      # or reads provinces.json, cities-municipalities.json,
//                                                # sub-municipalities.json, barangays.json from <dir>
//
// Writes public/ph-address/index.json (every province with its SPX zone and city names) and one
// public/ph-address/<slug>.json per province (its cities with their barangays). Re-run when PSA updates PSGC.
//
// Names follow what SPX Express shows (so addresses copied into SPX match cleanly): "City of Balanga" →
// "Balanga City", NCR → "Metro Manila", Manila split into its districts ("Sampaloc, Manila").
// Province names must match dg-prints-management-server/src/utils/phProvinces.ts (checked when that sibling
// repo is present), since the server validates the province and derives the shipping region from it.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outDir = path.join(root, "public", "ph-address")
const sourceDir = process.argv[2]
const API = "https://psgc.gitlab.io/api"

async function load(name) {
  if (sourceDir) return JSON.parse(fs.readFileSync(path.join(sourceDir, `${name}.json`), "utf8"))
  const res = await fetch(`${API}/${name}.json`)
  if (!res.ok) throw new Error(`GET ${API}/${name}.json → ${res.status}`)
  return res.json()
}

const [provinces, cities, subMunicipalities, barangays] = await Promise.all(
  ["provinces", "cities-municipalities", "sub-municipalities", "barangays"].map(load)
)

// The dataset predates the 2022 split of Maguindanao (RA 11550). These went to Maguindanao del Norte;
// the rest of the old province is Maguindanao del Sur.
const MAGUINDANAO_DEL_NORTE = new Set([
  "Barira", "Buldon", "Datu Blah T. Sinsuat", "Datu Odin Sinsuat", "Kabuntalan", "Matanog",
  "Northern Kabuntalan", "Parang", "Sultan Kudarat", "Sultan Mastura", "Talitay", "Upi",
])
// Independent cities the dataset leaves without a province, placed in their geographic one.
const PROVINCE_OF_INDEPENDENT_CITY = { "City of Isabela": "Basilan", "City of Cotabato": "Maguindanao del Norte" }
const METRO_MANILA = "Metro Manila"
const NCR_REGION = "130000000"

// SPX's top level ("zone"), shown before the province: Metro Manila, North Luzon, South Luzon, Visayas,
// Mindanao. North Luzon = Regions I, II, III and CAR (matches SPX's own list); South Luzon = IV-A,
// MIMAROPA and V.
const NORTH_LUZON_REGIONS = new Set(["010000000", "020000000", "030000000", "140000000"])
function zoneOf(province) {
  if (province.islandGroupCode === "visayas") return "Visayas"
  if (province.islandGroupCode === "mindanao") return "Mindanao"
  return NORTH_LUZON_REGIONS.has(province.regionCode) ? "North Luzon" : "South Luzon"
}

const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i
/** Collapses spaces and fixes the dataset's odd casing: "Tondo I/ii" → "Tondo I/II", "Gen. s.k." → "Gen. S.K.". */
function tidy(name) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(/(\s|\/)/)
    .map((word) => (ROMAN.test(word) ? word.toUpperCase() : word))
    .join("")
    .replace(/\b([a-z])\./g, (m) => m.toUpperCase())
}
const provinceName = (name) => tidy(name).replace(/ (Del|De) /g, (m) => m.toLowerCase())
const cityName = (name) => {
  const clean = tidy(name)
  const match = /^City of (.+)$/.exec(clean)
  return match ? `${match[1]} City` : clean
}
const barangayName = (name) => tidy(name).replace(/\s*\(Pob\.\)$/i, "")
const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
const byName = (a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" })

// province name → city name → Set(barangay)
const tree = new Map()
function addCity(province, city) {
  if (!tree.has(province)) tree.set(province, new Map())
  const provinceCities = tree.get(province)
  if (!provinceCities.has(city)) provinceCities.set(city, new Set())
  return provinceCities.get(city)
}

const provinceByCode = new Map(provinces.map((p) => [p.code, provinceName(p.name)]))
const zoneByProvince = new Map(provinces.map((p) => [provinceName(p.name), zoneOf(p)]))
zoneByProvince.set(METRO_MANILA, "Metro Manila")
zoneByProvince.set("Maguindanao del Norte", "Mindanao")
zoneByProvince.set("Maguindanao del Sur", "Mindanao")
const cityByCode = new Map()
for (const city of cities) {
  let province
  if (city.provinceCode) province = provinceByCode.get(city.provinceCode)
  else if (city.regionCode === NCR_REGION) province = METRO_MANILA
  else province = PROVINCE_OF_INDEPENDENT_CITY[city.name]
  if (!province) throw new Error(`No province for city ${city.name} (${city.code})`)
  if (province === "Maguindanao") {
    province = MAGUINDANAO_DEL_NORTE.has(city.name) ? "Maguindanao del Norte" : "Maguindanao del Sur"
  }
  cityByCode.set(city.code, { province, name: cityName(city.name) })
}
// Manila's barangays hang off its districts, which SPX lists in place of "Manila".
const districtByCode = new Map(
  subMunicipalities.map((s) => [s.code, { province: METRO_MANILA, name: `${tidy(s.name).replace(/ I\/II$/, "")}, Manila` }])
)

for (const barangay of barangays) {
  const parent =
    (barangay.subMunicipalityCode && districtByCode.get(barangay.subMunicipalityCode)) ||
    cityByCode.get(barangay.cityCode || barangay.municipalityCode)
  if (!parent) throw new Error(`No city for barangay ${barangay.name} (${barangay.code})`)
  addCity(parent.province, parent.name).add(barangayName(barangay.name))
}

// Province names must equal the server's list (it validates them and maps them to a shipping region).
const serverProvinces = path.resolve(root, "..", "dg-prints-management-server", "src", "utils", "phProvinces.ts")
if (fs.existsSync(serverProvinces)) {
  const source = fs.readFileSync(serverProvinces, "utf8")
  const lists = [...source.matchAll(/const (?:LUZON|VISAYAS|MINDANAO) = \[([\s\S]*?)\];/g)].map((m) => m[1])
  const expected = new Set(lists.flatMap((list) => [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])))
  const actual = new Set(tree.keys())
  const missing = [...expected].filter((name) => !actual.has(name))
  const extra = [...actual].filter((name) => !expected.has(name))
  if (missing.length || extra.length) {
    throw new Error(`Province names differ from phProvinces.ts — missing: ${missing.join(", ")}; extra: ${extra.join(", ")}`)
  }
} else {
  console.warn(`! ${serverProvinces} not found — skipped the province-name check`)
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const index = []
let barangayCount = 0
for (const province of [...tree.keys()].sort(byName)) {
  const slug = slugify(province)
  const provinceCities = [...tree.get(province)]
    .map(([name, set]) => ({ name, barangays: [...set].sort(byName) }))
    .sort((a, b) => byName(a.name, b.name))
  barangayCount += provinceCities.reduce((sum, city) => sum + city.barangays.length, 0)
  const zone = zoneByProvince.get(province)
  if (!zone) throw new Error(`No zone for province ${province}`)
  index.push({ name: province, slug, zone, cities: provinceCities.map((city) => city.name) })
  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify({ name: province, cities: provinceCities }))
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({ provinces: index }))
console.log(`Wrote ${index.length} provinces, ${index.reduce((s, p) => s + p.cities.length, 0)} cities, ${barangayCount} barangays to ${path.relative(root, outDir)}`)
