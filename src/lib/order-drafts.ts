import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/lib/auth"
import type { LineItemDraft } from "@/lib/order-line-item"
import type { OrderChannel, PaymentMethod } from "@/lib/orders"
import { generateId } from "@/lib/utils"

export type OrderDraftFields = {
  customerName: string
  customerPhone: string
  items: LineItemDraft[]
  discount: string
  additionalFees: string
  notes: string
  layoutFee: string
  shippingEnabled: boolean
  sameName: boolean
  samePhone: boolean
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  shippingFee: string
  channel: OrderChannel | ""
  markPaid: boolean
  paymentStatus: "paid" | "partially_paid"
  paymentMethod: PaymentMethod | ""
  downPayment: string
}

export type OrderDraft = {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
  fields: OrderDraftFields
}

const ORDER_DRAFTS_STORAGE_KEY = "dgprints_order_drafts"
const DEFAULT_TTL_HOURS = 48

function getOrderDraftTtlMs(): number {
  const raw = Number(import.meta.env.VITE_ORDER_DRAFT_TTL_HOURS)
  const hours = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_HOURS
  return hours * 60 * 60 * 1000
}

function readAllDrafts(): OrderDraft[] {
  const raw = localStorage.getItem(ORDER_DRAFTS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as OrderDraft[]) : []
  } catch {
    return []
  }
}

function writeAllDrafts(drafts: OrderDraft[]): void {
  localStorage.setItem(ORDER_DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
}

function pruneExpired(drafts: OrderDraft[]): OrderDraft[] {
  const ttlMs = getOrderDraftTtlMs()
  const now = Date.now()
  return drafts.filter((draft) => now - new Date(draft.updatedAt).getTime() < ttlMs)
}

function readUserDrafts(userId: string): OrderDraft[] {
  const all = readAllDrafts()
  const pruned = pruneExpired(all)
  if (pruned.length !== all.length) writeAllDrafts(pruned)
  return pruned
    .filter((draft) => draft.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

function saveOrderDraft(userId: string, fields: OrderDraftFields, existingId?: string): OrderDraft {
  const all = pruneExpired(readAllDrafts())
  const now = new Date().toISOString()
  const existing = existingId ? all.find((draft) => draft.id === existingId) : undefined

  const saved: OrderDraft = existing
    ? { ...existing, fields, updatedAt: now }
    : { id: generateId(), userId, createdAt: now, updatedAt: now, fields }

  const next = existing ? all.map((draft) => (draft.id === saved.id ? saved : draft)) : [...all, saved]
  writeAllDrafts(next)
  return saved
}

function deleteOrderDraft(id: string): void {
  writeAllDrafts(readAllDrafts().filter((draft) => draft.id !== id))
}

/** Current user's live, non-expired order drafts, newest first — for the New Order page's draft list. */
export function useOrderDrafts() {
  const { user } = useAuth()
  const [drafts, setDrafts] = useState<OrderDraft[]>([])

  const refresh = useCallback(() => {
    setDrafts(user ? readUserDrafts(user.id) : [])
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  function saveDraft(fields: OrderDraftFields, existingId?: string): OrderDraft | null {
    if (!user) return null
    const saved = saveOrderDraft(user.id, fields, existingId)
    refresh()
    return saved
  }

  function deleteDraft(id: string) {
    deleteOrderDraft(id)
    refresh()
  }

  return { drafts, saveDraft, deleteDraft, refresh }
}
