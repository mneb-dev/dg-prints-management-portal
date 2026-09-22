import dgPrintsLogo from "@/assets/images/dg-prints-logo.png"
import { cn } from "@/lib/utils"

/** The "DG Prints" logo mark (gradient DG monogram + PRINTS wordmark, baked into one image).
 * Sized by the caller via `className`. */
export function Logo({ className }: { className?: string }) {
  return <img src={dgPrintsLogo} alt="DG Prints" className={cn("object-contain", className)} />
}
