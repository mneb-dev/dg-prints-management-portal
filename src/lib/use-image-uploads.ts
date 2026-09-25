import { useCallback, useEffect, useRef, useState } from "react"

import { getErrorMessage } from "@/lib/api-error"
import { useAppDispatch } from "@/lib/hooks"
import {
  compressImage,
  MAX_PRODUCT_IMAGES,
  putToSignedUrl,
  registerImage,
  requestUploadUrl,
  validateImageFile,
} from "@/lib/product-images"
import { productImageAdded } from "@/lib/products-slice"

/** queued → compressing → uploading (with %) → saving → removed from the queue once the image is
 *  on the product; any step can land in `error`, which `retry` sends back to `queued`. */
export type UploadPhase = "queued" | "compressing" | "uploading" | "saving" | "error"

export type UploadItem = {
  localId: string
  file: File
  previewUrl: string
  phase: UploadPhase
  /** 0–100, byte progress of the storage PUT. */
  progress: number
  error: string | null
}

const MAX_CONCURRENT = 2
const ACTIVE_PHASES: UploadPhase[] = ["compressing", "uploading", "saving"]

/** Upload queue for one product's images. The dialog only renders `items`; this hook owns the
 *  pipeline (resize → signed URL → PUT with progress → register) and pushes finished images into
 *  the products store. */
export function useImageUploads(productId: string | null, currentImageCount: number) {
  const dispatch = useAppDispatch()
  const [items, setItems] = useState<UploadItem[]>([])
  const started = useRef(new Set<string>())
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const patch = useCallback((localId: string, next: Partial<UploadItem>) => {
    setItems((list) => list.map((item) => (item.localId === localId ? { ...item, ...next } : item)))
  }, [])

  const run = useCallback(
    async (item: UploadItem, targetProductId: string) => {
      try {
        patch(item.localId, { phase: "compressing", progress: 0, error: null })
        const blob = await compressImage(item.file)

        patch(item.localId, { phase: "uploading" })
        const { uploadUrl, path } = await requestUploadUrl(targetProductId)
        await putToSignedUrl(uploadUrl, blob, (progress) => patch(item.localId, { progress }))

        patch(item.localId, { phase: "saving", progress: 100 })
        const image = await registerImage(targetProductId, path)
        dispatch(productImageAdded({ productId: targetProductId, image }))

        URL.revokeObjectURL(item.previewUrl)
        setItems((list) => list.filter((entry) => entry.localId !== item.localId))
      } catch (err) {
        patch(item.localId, { phase: "error", error: getErrorMessage(err) })
      } finally {
        started.current.delete(item.localId)
      }
    },
    [dispatch, patch]
  )

  // Scheduler: keep up to MAX_CONCURRENT uploads in flight, oldest first.
  useEffect(() => {
    if (!productId) return
    const active = items.filter((item) => ACTIVE_PHASES.includes(item.phase)).length
    const queued = items.filter((item) => item.phase === "queued" && !started.current.has(item.localId))
    for (const item of queued.slice(0, Math.max(0, MAX_CONCURRENT - active))) {
      started.current.add(item.localId)
      void run(item, productId)
    }
  }, [items, productId, run])

  // Switching product (or closing the dialog) drops anything not yet started or failed.
  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl)
      setItems([])
    }
  }, [productId])

  /** Slots left once existing images and not-yet-failed uploads are counted. */
  const pending = items.filter((item) => item.phase !== "error").length
  const remaining = Math.max(0, MAX_PRODUCT_IMAGES - currentImageCount - pending)

  /** Queues what fits; returns user-facing messages for anything skipped. */
  function addFiles(files: File[]): string[] {
    const problems: string[] = []
    const accepted: UploadItem[] = []
    for (const file of files) {
      const invalid = validateImageFile(file)
      if (invalid) {
        problems.push(`${file.name}: ${invalid}`)
        continue
      }
      if (accepted.length >= remaining) {
        problems.push(`Only ${MAX_PRODUCT_IMAGES} images per product — ${file.name} was skipped.`)
        continue
      }
      accepted.push({
        localId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        phase: "queued",
        progress: 0,
        error: null,
      })
    }
    if (accepted.length > 0) setItems((list) => [...list, ...accepted])
    return problems
  }

  function retry(localId: string) {
    if (remaining <= 0) return
    patch(localId, { phase: "queued", progress: 0, error: null })
  }

  function dismiss(localId: string) {
    const item = items.find((entry) => entry.localId === localId)
    if (item) URL.revokeObjectURL(item.previewUrl)
    setItems((list) => list.filter((entry) => entry.localId !== localId))
  }

  return {
    items,
    remaining,
    isUploading: items.some((item) => item.phase !== "error"),
    addFiles,
    retry,
    dismiss,
  }
}
