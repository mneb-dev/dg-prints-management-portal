import { toast } from "sonner"

export const SPX_ADMIN_CREATE_ORDER_URL = "https://spx.ph/spx-admin/single-order/create"

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard.")
  } catch {
    toast.error("Couldn't copy to clipboard.")
  }
}
