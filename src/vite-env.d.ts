/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ORDER_DRAFT_TTL_HOURS?: string
  readonly VITE_SHOP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
