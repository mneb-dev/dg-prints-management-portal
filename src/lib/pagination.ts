import { useEffect } from "react"

export type PageItem = number | "ellipsis-start" | "ellipsis-end"

/** Page numbers to show: always the first and last page plus one neighbour either side of the
 * current one, with an ellipsis standing in for each skipped run (a single skipped page is shown
 * as its number instead — an ellipsis there would hide nothing). */
export function getPageItems(page: number, pageCount: number): PageItem[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  const sorted = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)

  const items: PageItem[] = []
  for (const n of sorted) {
    const previous = items[items.length - 1]
    if (typeof previous === "number" && n - previous === 2) items.push(previous + 1)
    else if (typeof previous === "number" && n - previous > 2) {
      items.push(n < page ? "ellipsis-start" : "ellipsis-end")
    }
    items.push(n)
  }
  return items
}

/** Pulls `page` back to the last page once a fetch settles past the end — e.g. after deleting the
 * only row on the last page, or releasing every row under an "unreleased" filter. */
export function useClampPage(
  page: number,
  pageSize: number,
  total: number,
  isFetching: boolean,
  setPage: (page: number) => void
) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => {
    if (!isFetching && page > pageCount) setPage(pageCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching, page, pageCount])
}
