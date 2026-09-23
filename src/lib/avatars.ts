import { useSyncExternalStore } from "react"
import { createAvatar, type Style } from "@dicebear/core"
import * as avataaars from "@dicebear/avataaars"

// Avatar keys are DiceBear seeds — the backend has no knowledge of these lists, it only stores the
// key string. A bare seed ("Buddy") is the original avataaars set, so avatars picked before the
// packs existed keep rendering exactly as they did; newer packs use "<pack>:<seed>".
//
// Only the Classic style ships in the main bundle. The other styles are large (Sketch and
// Adventurer are ~100 KB gzipped each), so each loads on first use — when someone who picked one
// appears on screen, or its tab is opened in the avatar picker.

export type AvatarPackId = "classic" | "notion" | "lorelei" | "adventurer" | "micah" | "personas" | "glass"

// Soft tints of the brand indigo/violet and the teal/gold/rose/sky status hues, so illustrated
// avatars sit on the same palette as the rest of the app instead of DiceBear's random colors.
const BRAND_TINTS = ["e0e7ff", "ede9fe", "ccfbf1", "fef3c7", "ffe4e6", "e0f2fe"]
const TINTED = { backgroundColor: BRAND_TINTS, backgroundType: ["gradientLinear"] }

type AnyStyle = Style<object>

type PackDefinition = {
  id: AvatarPackId
  label: string
  load: () => Promise<AnyStyle>
  /** Extra DiceBear options for the pack's "premium" look. */
  options?: Record<string, unknown>
  seeds: readonly string[]
}

const PACK_DEFINITIONS: PackDefinition[] = [
  {
    id: "classic",
    label: "Classic",
    load: async () => avataaars as AnyStyle,
    seeds: [
      "Buddy", "Milo", "Nala", "Zoe", "Leo", "Luna", "Max", "Coco", "Rex", "Bella", "Charlie", "Daisy",
      "Duke", "Ellie", "Finn", "Ginger", "Hazel", "Jasper", "Kiwi", "Lola", "Oscar", "Pepper", "Rocky", "Willow",
    ],
  },
  {
    id: "notion",
    label: "Sketch",
    load: () => import("@dicebear/notionists").then((module) => module as unknown as AnyStyle),
    options: TINTED,
    seeds: ["Aria", "Ben", "Cleo", "Dante", "Esme", "Felix", "Gia", "Hugo", "Iris", "Jude", "Kai", "Mara"],
  },
  {
    id: "lorelei",
    label: "Lorelei",
    load: () => import("@dicebear/lorelei").then((module) => module as unknown as AnyStyle),
    options: TINTED,
    seeds: ["Amara", "Bianca", "Callie", "Dahlia", "Elio", "Freya", "Gemma", "Ivy", "Juno", "Liam", "Nico", "Orla"],
  },
  {
    id: "adventurer",
    label: "Adventurer",
    load: () => import("@dicebear/adventurer").then((module) => module as unknown as AnyStyle),
    options: TINTED,
    seeds: ["Atlas", "Blaze", "Cora", "Echo", "Flint", "Harper", "Indie", "Koa", "Nova", "Remy", "Sage", "Tala"],
  },
  {
    id: "micah",
    label: "Micah",
    load: () => import("@dicebear/micah").then((module) => module as unknown as AnyStyle),
    options: TINTED,
    seeds: ["Alba", "Bo", "Cyrus", "Dara", "Emil", "Fern", "Gus", "Hana", "Ines", "Joss", "Lark", "Moss"],
  },
  {
    id: "personas",
    label: "Personas",
    load: () => import("@dicebear/personas").then((module) => module as unknown as AnyStyle),
    options: TINTED,
    seeds: ["Ayla", "Bruno", "Cass", "Dex", "Eden", "Faye", "Gil", "Hollis", "Isla", "Jax", "Lena", "Omar"],
  },
  {
    id: "glass",
    label: "Glass",
    load: () => import("@dicebear/glass").then((module) => module as unknown as AnyStyle),
    seeds: ["Aurora", "Borealis", "Cobalt", "Dusk", "Ember", "Frost", "Lagoon", "Mirage", "Nebula", "Opal", "Prism", "Tide"],
  },
]

const PACKS_BY_ID = new Map(PACK_DEFINITIONS.map((pack) => [pack.id, pack]))

function keyFor(pack: PackDefinition, seed: string): string {
  return pack.id === "classic" ? seed : `${pack.id}:${seed}`
}

export const AVATAR_PACKS = PACK_DEFINITIONS.map((pack) => ({
  id: pack.id,
  label: pack.label,
  keys: pack.seeds.map((seed) => keyFor(pack, seed)),
}))

/** Every selectable avatar key, across all packs. */
export const AVATAR_KEYS = AVATAR_PACKS.flatMap((pack) => pack.keys)

function parseKey(key: string): { pack: PackDefinition; seed: string } {
  const separator = key.indexOf(":")
  if (separator > 0) {
    const pack = PACKS_BY_ID.get(key.slice(0, separator) as AvatarPackId)
    if (pack) return { pack, seed: key.slice(separator + 1) }
  }
  return { pack: PACKS_BY_ID.get("classic")!, seed: key }
}

/** Which pack an avatar key belongs to — the picker opens on it. */
export function getAvatarPackId(key: string | null | undefined): AvatarPackId {
  return key ? parseKey(key).pack.id : "classic"
}

// ---- Lazy style loading ----

const loadedStyles = new Map<AvatarPackId, AnyStyle>([["classic", avataaars as AnyStyle]])
const pendingLoads = new Set<AvatarPackId>()
const listeners = new Set<() => void>()
let loadVersion = 0

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getLoadVersion() {
  return loadVersion
}

/** Starts loading a pack's style if it isn't loaded yet (e.g. when its picker tab opens). */
export function preloadAvatarPack(id: AvatarPackId) {
  if (loadedStyles.has(id) || pendingLoads.has(id)) return
  const pack = PACKS_BY_ID.get(id)
  if (!pack) return
  pendingLoads.add(id)
  pack
    .load()
    .then((style) => {
      loadedStyles.set(id, style)
      loadVersion += 1
      listeners.forEach((listener) => listener())
    })
    .catch(() => {
      // Leave it unloaded — the Avatar keeps showing its initials fallback.
    })
    .finally(() => pendingLoads.delete(id))
}

// Rendering an SVG isn't free and the picker shows a dozen+ at once, while the sidebar and the
// Users table re-render the same few constantly — cache by key.
const dataUriCache = new Map<string, string>()

/** The avatar's image as a data URI, or null while its pack's style is still loading (the load
 * is started here). Components should use `useAvatarDataUri` so they re-render once it lands. */
export function getAvatarDataUri(key: string): string | null {
  const cached = dataUriCache.get(key)
  if (cached) return cached
  const { pack, seed } = parseKey(key)
  const style = loadedStyles.get(pack.id)
  if (!style) {
    preloadAvatarPack(pack.id)
    return null
  }
  const uri = createAvatar(style, { seed, size: 128, ...pack.options }).toDataUri()
  dataUriCache.set(key, uri)
  return uri
}

/** `getAvatarDataUri` for components: re-renders when a lazily loaded pack arrives. */
export function useAvatarDataUri(key: string | null | undefined): string | undefined {
  useSyncExternalStore(subscribe, getLoadVersion)
  return key ? (getAvatarDataUri(key) ?? undefined) : undefined
}
