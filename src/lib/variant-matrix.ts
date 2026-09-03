import type { AppliesToCondition, ProductOption } from "@/lib/products"

export type VariantCombination = AppliesToCondition[]

/**
 * Cross product of every option's values — one combination per row of the Shopee-style pricing
 * matrix (e.g. Type × Package). Options with no values yet are skipped, so a partially-filled-in
 * variation doesn't block the whole matrix. Returns `[]` if no option has any values.
 */
export function cartesianOptionCombinations(options: ProductOption[]): VariantCombination[] {
  const usable = options.filter((option) => option.values.length > 0)
  if (usable.length === 0) return []

  return usable.reduce<VariantCombination[]>(
    (combinations, option) =>
      combinations.flatMap((combination) =>
        option.values.map((value) => [...combination, { optionId: option.id, value }])
      ),
    [[]]
  )
}

/** Order-independent equality — used to match an existing pricing entry to a regenerated
 *  combination so edits to unrelated option values don't clobber prices already entered. */
export function combinationsMatch(a: VariantCombination, b: VariantCombination): boolean {
  if (a.length !== b.length) return false
  return a.every((condition) =>
    b.some((other) => other.optionId === condition.optionId && other.value === condition.value)
  )
}
