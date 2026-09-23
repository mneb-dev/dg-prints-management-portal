import { AvatarImage } from "@/components/ui/avatar"
import { useAvatarDataUri } from "@/lib/avatars"

/** `AvatarImage` for a stored avatar key. Renders nothing (so the Avatar shows its fallback) when
 * there's no key, or while the key's avatar pack is still loading — then fills in once it lands. */
export function UserAvatarImage({ avatarKey, alt }: { avatarKey: string | null | undefined; alt: string }) {
  const src = useAvatarDataUri(avatarKey)
  return src ? <AvatarImage src={src} alt={alt} /> : null
}
