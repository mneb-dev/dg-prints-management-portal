/** The public online shop for this environment (local / dev preview / prod), set per environment
 * via `VITE_SHOP_URL` like the API base URL. Null when unset, so the sidebar link hides instead of
 * pointing somewhere wrong. */
export const SHOP_URL = import.meta.env.VITE_SHOP_URL?.trim().replace(/\/+$/, "") || null
