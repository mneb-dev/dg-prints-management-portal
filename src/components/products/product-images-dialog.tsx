import { useRef, useState, type DragEvent } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ImagePlusIcon,
  ImagesIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import { FormDialogHeader } from "@/components/form-dialog-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-error"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { ACCEPTED_IMAGE_TYPES, deleteImage, MAX_PRODUCT_IMAGES, reorderImages } from "@/lib/product-images"
import { productImagesChanged, type ProductImage } from "@/lib/products-slice"
import { useImageUploads, type UploadItem } from "@/lib/use-image-uploads"
import { cn } from "@/lib/utils"

const TILE_CLASS = "relative aspect-square overflow-hidden rounded-xl border bg-muted"

function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function ImageTile({
  image,
  index,
  count,
  disabled,
  onMove,
  onDelete,
}: {
  image: ProductImage
  index: number
  count: number
  disabled: boolean
  onMove: (to: number) => void
  onDelete: () => void
}) {
  const isMain = index === 0
  return (
    <div className={cn(TILE_CLASS, isMain && "col-span-2 row-span-2")}>
      <img
        src={image.url}
        alt={isMain ? "Main image" : `Image ${index + 1}`}
        className="size-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {isMain && (
        <Badge className="absolute bottom-2 left-2 gap-1 shadow-sm">
          <StarIcon className="size-3 fill-current" />
          <span className="leading-none">Main</span>
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label={isMain ? "Main image actions" : `Image ${index + 1} actions`}
              className="absolute top-2 right-2 rounded-full bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {!isMain && (
            <DropdownMenuItem onClick={() => onMove(0)}>
              <StarIcon />
              <span className="leading-none">Set as main</span>
            </DropdownMenuItem>
          )}
          {index > 0 && (
            <DropdownMenuItem onClick={() => onMove(index - 1)}>
              <ArrowLeftIcon />
              <span className="leading-none">Move earlier</span>
            </DropdownMenuItem>
          )}
          {index < count - 1 && (
            <DropdownMenuItem onClick={() => onMove(index + 1)}>
              <ArrowRightIcon />
              <span className="leading-none">Move later</span>
            </DropdownMenuItem>
          )}
          {count > 1 && <DropdownMenuSeparator />}
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon />
            <span className="leading-none">Delete image</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const PHASE_LABEL: Record<UploadItem["phase"], string> = {
  queued: "Waiting…",
  compressing: "Resizing…",
  uploading: "Uploading",
  saving: "Saving…",
  error: "Failed",
}

function UploadTile({
  item,
  canRetry,
  onRetry,
  onDismiss,
}: {
  item: UploadItem
  canRetry: boolean
  onRetry: () => void
  onDismiss: () => void
}) {
  const isError = item.phase === "error"
  const percent = item.phase === "uploading" ? item.progress : item.phase === "saving" ? 100 : 0
  return (
    <div className={TILE_CLASS} aria-busy={!isError}>
      <img src={item.previewUrl} alt="" className="size-full object-cover opacity-60 blur-[1px]" />
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end gap-1.5 p-2.5",
          isError ? "bg-destructive/15" : "bg-gradient-to-t from-background/90 via-background/40 to-transparent"
        )}
      >
        {isError ? (
          <>
            <p className="line-clamp-3 text-xs font-medium text-destructive" title={item.error ?? undefined}>
              {item.error}
            </p>
            <div className="flex gap-1">
              <Button size="xs" variant="secondary" onClick={onRetry} disabled={!canRetry}>
                <RotateCcwIcon data-icon="inline-start" />
                Retry
              </Button>
              <Button size="icon-xs" variant="ghost" aria-label="Dismiss" onClick={onDismiss}>
                <XIcon />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                {item.phase !== "uploading" && <Spinner className="size-3" />}
                {PHASE_LABEL[item.phase]}
              </span>
              {item.phase === "uploading" && <span className="tabular-nums">{item.progress}%</span>}
            </div>
            <div
              role="progressbar"
              aria-label={`Uploading ${item.file.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
                style={{ width: `${percent}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Upload, order and delete a product's photos. The first image is the main one (shown on shop
 *  cards); the rest appear in the product page's gallery. Every change saves immediately. */
export function ProductImagesDialog({
  productId,
  onOpenChange,
}: {
  productId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const dispatch = useAppDispatch()
  // Read live from the store so uploads, reorders and deletes show up as they land.
  const product = useAppSelector((state) =>
    productId
      ? (state.products.items.find((item) => item.id === productId) ??
        state.products.catalog.find((item) => item.id === productId) ??
        null)
      : null
  )
  const images = product?.images ?? []
  const uploads = useImageUploads(productId, images.length)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [deleting, setDeleting] = useState<ProductImage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canAdd = uploads.remaining > 0
  const busy = isReordering || isDeleting

  function queueFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return
    const problems = uploads.addFiles(Array.from(files))
    for (const problem of problems) toast.error(problem)
  }

  async function handleMove(from: number, to: number) {
    if (!product || from === to) return
    const previous = images
    const next = moveItem(images, from, to)
    dispatch(productImagesChanged({ productId: product.id, images: next }))
    setIsReordering(true)
    try {
      const saved = await reorderImages(
        product.id,
        next.map((image) => image.id)
      )
      dispatch(productImagesChanged({ productId: product.id, images: saved }))
      if (to === 0) toast.success("Main image updated.")
    } catch (err) {
      dispatch(productImagesChanged({ productId: product.id, images: previous }))
      toast.error(getErrorMessage(err))
    } finally {
      setIsReordering(false)
    }
  }

  async function handleConfirmDelete() {
    if (!product || !deleting) return
    setIsDeleting(true)
    try {
      await deleteImage(product.id, deleting.id)
      dispatch(
        productImagesChanged({
          productId: product.id,
          images: images.filter((image) => image.id !== deleting.id),
        })
      )
      toast.success("Image deleted.")
      setDeleting(null)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeleting(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (canAdd) queueFiles(event.dataTransfer.files)
  }

  function requestClose(open: boolean) {
    if (!open && uploads.isUploading) {
      toast.info("Wait for the uploads to finish before closing.")
      return
    }
    onOpenChange(open)
  }

  const deletingIndex = deleting ? images.findIndex((image) => image.id === deleting.id) : -1
  const isEmpty = images.length === 0 && uploads.items.length === 0

  return (
    <>
      <Dialog open={!!productId} onOpenChange={requestClose}>
        <DialogContent className="sm:max-w-2xl">
          <FormDialogHeader
            icon={ImagesIcon}
            title="Product images"
            description={
              product ? (
                <>
                  {product.name} · {images.length} of {MAX_PRODUCT_IMAGES}
                </>
              ) : undefined
            }
          />

          <DialogBody
            onDragOver={(event) => {
              if (!canAdd) return
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false)
            }}
            onDrop={handleDrop}
            className="flex flex-col gap-3 pb-1"
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                queueFiles(event.target.files)
                event.target.value = ""
              }}
            />

            {isEmpty ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors outline-none hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50",
                  isDragging && "border-primary bg-accent/60"
                )}
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <ImagePlusIcon className="size-6" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Drop photos here or click to browse</span>
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG or WebP · up to {MAX_PRODUCT_IMAGES} images · the first one becomes the main image
                  </span>
                </span>
              </button>
            ) : (
              <div
                className={cn(
                  "grid grid-cols-2 gap-3 rounded-2xl sm:grid-cols-4",
                  isDragging && "ring-2 ring-primary ring-offset-4 ring-offset-popover"
                )}
              >
                {images.map((image, index) => (
                  <ImageTile
                    key={image.id}
                    image={image}
                    index={index}
                    count={images.length}
                    disabled={busy}
                    onMove={(to) => void handleMove(index, to)}
                    onDelete={() => setDeleting(image)}
                  />
                ))}
                {uploads.items.map((item) => (
                  <UploadTile
                    key={item.localId}
                    item={item}
                    canRetry={uploads.remaining > 0}
                    onRetry={() => uploads.retry(item.localId)}
                    onDismiss={() => uploads.dismiss(item.localId)}
                  />
                ))}
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-muted-foreground transition-colors outline-none hover:border-primary/50 hover:bg-accent/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <ImagePlusIcon className="size-5" />
                    <span className="text-xs font-medium">Add images</span>
                  </button>
                )}
              </div>
            )}
          </DialogBody>

          <DialogFooter className="sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              The main image shows on shop cards. Changes save automatically.
            </p>
            <Button onClick={() => requestClose(false)} disabled={uploads.isUploading}>
              {uploads.isUploading && <Spinner data-icon="inline-start" />}
              {uploads.isUploading ? "Uploading…" : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="danger"
        icon={Trash2Icon}
        title={<>Delete {deletingIndex === 0 ? <Name>the main image</Name> : "this image"}?</>}
        description={
          deletingIndex === 0 && images.length > 1
            ? "The next image becomes the main image. This can't be undone."
            : "It will be removed from the product and the online shop. This can't be undone."
        }
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        isPending={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  )
}
