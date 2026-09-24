/** "New product" rule shared by the Products sidebar badge and the "New" pill on product rows
 * (components/new-badge.tsx): an active product counts as new for NEW_PRODUCT_DAYS after it's
 * created. The sidebar shows how many products are currently new, and both drop on their own as
 * they age out. */

export const NEW_PRODUCT_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

export function isNewProduct(product: { createdAt: string; status: string }, now: number): boolean {
  if (product.status !== "Active") return false
  const created = new Date(product.createdAt).getTime()
  return !Number.isNaN(created) && now - created < NEW_PRODUCT_DAYS * DAY_MS
}
