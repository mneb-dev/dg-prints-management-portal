import axios from "axios"

import { apiClient } from "@/lib/api-client"
import type { ProductImage } from "@/lib/products-slice"

/** Mirrors the server's MAX_PRODUCT_IMAGES — one main image plus up to 7 sub images. */
export const MAX_PRODUCT_IMAGES = 8

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 0.85

/** Returns a user-facing reason the file can't be used, or null when it's fine. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Only JPG, PNG or WebP images are supported."
  if (file.size > MAX_SOURCE_BYTES) return "Image is larger than 15 MB."
  return null
}

/** Shrinks an image to at most 1600px on its longest side and re-encodes it as WebP, so the shop
 *  loads fast and uploads stay well under the bucket's 5 MB limit. */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Your browser can't process images.")
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY))
    if (!blob) throw new Error("Couldn't convert the image.")
    return blob
  } finally {
    bitmap.close()
  }
}

function imagesPath(productId: string) {
  return `/products/${productId}/images`
}

export async function requestUploadUrl(productId: string): Promise<{ uploadUrl: string; path: string }> {
  const { data } = await apiClient.post<{ uploadUrl: string; path: string }>(`${imagesPath(productId)}/upload-url`)
  return data
}

/** PUTs the file straight to storage. Plain axios (not apiClient): the signed URL carries its own
 *  token, and our Bearer header / 401-logout interceptor don't belong on a storage request. */
export async function putToSignedUrl(uploadUrl: string, blob: Blob, onProgress: (percent: number) => void) {
  await axios.put(uploadUrl, blob, {
    headers: { "Content-Type": "image/webp", "x-upsert": "false" },
    onUploadProgress: (event) => {
      if (event.total) onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
}

export async function registerImage(productId: string, path: string): Promise<ProductImage> {
  const { data } = await apiClient.post<ProductImage>(imagesPath(productId), { path })
  return data
}

export async function reorderImages(productId: string, imageIds: string[]): Promise<ProductImage[]> {
  const { data } = await apiClient.put<ProductImage[]>(`${imagesPath(productId)}/order`, { imageIds })
  return data
}

export async function deleteImage(productId: string, imageId: string): Promise<void> {
  await apiClient.delete(`${imagesPath(productId)}/${imageId}`)
}
