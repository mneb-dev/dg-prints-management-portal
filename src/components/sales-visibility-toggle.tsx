import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { useSalesVisibility } from "@/lib/sales-visibility"

export function SalesVisibilityToggle({ className }: { className?: string }) {
  const { role } = useAuth()
  const { isVisible, toggleVisibility } = useSalesVisibility()

  if (role === "staff") return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleVisibility}
      aria-label={isVisible ? "Hide amounts" : "Show amounts"}
      className={className}
    >
      {isVisible ? <EyeIcon /> : <EyeOffIcon />}
    </Button>
  )
}
