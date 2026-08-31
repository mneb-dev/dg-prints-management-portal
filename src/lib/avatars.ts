import { createAvatar } from "@dicebear/core"
import { avataaars } from "@dicebear/collection"

// A fixed, curated set of avatar keys. Each key is just a DiceBear seed —
// the backend has no knowledge of this list, it only stores the key string.
export const AVATAR_KEYS = [
  "Buddy",
  "Milo",
  "Nala",
  "Zoe",
  "Leo",
  "Luna",
  "Max",
  "Coco",
  "Rex",
  "Bella",
  "Charlie",
  "Daisy",
  "Duke",
  "Ellie",
  "Finn",
  "Ginger",
  "Hazel",
  "Jasper",
  "Kiwi",
  "Lola",
  "Oscar",
  "Pepper",
  "Rocky",
  "Willow",
] as const

export function getAvatarDataUri(key: string): string {
  return createAvatar(avataaars, { seed: key, size: 64 }).toDataUri()
}
