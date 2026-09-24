import dgPrintsLogo from "@/assets/images/dg-prints-logo.png"
import dgPrintsLogoDark from "@/assets/images/dg-prints-logo-dark.png"
import { cn } from "@/lib/utils"

/** The "DG Prints" logo mark (gradient DG monogram + PRINTS wordmark, baked into one image).
 * Sized by the caller via `className`. Dark mode swaps to a variant with a light wordmark — both
 * images render and CSS picks one, so there's no flash or theme hook. */
export function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src={dgPrintsLogo} alt="DG Prints" className={cn("object-contain dark:hidden", className)} />
      <img
        src={dgPrintsLogoDark}
        alt="DG Prints"
        className={cn("hidden object-contain dark:block", className)}
      />
    </>
  )
}
