/** SPX's mass order template "Item Type" values (its drop-down list). */
export const SPX_ITEM_TYPES = [
  "Food and beverage",
  "Clothing",
  "Electronics",
  "Medical",
  "Groceries",
  "General merchandise",
  "Fragile",
] as const

export type SpxItemType = (typeof SPX_ITEM_TYPES)[number]
