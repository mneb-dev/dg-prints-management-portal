import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"

// Duplicated from auth-slice.ts's AUTH_STORAGE_KEY (not imported) to avoid a
// circular import: auth-slice.ts imports apiClient from this module.
const AUTH_STORAGE_KEY = "dgprints_auth"

export const apiClient = axios.create({ baseURL: API_BASE_URL })

apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (raw) {
    try {
      const { token } = JSON.parse(raw) as { token?: string }
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {
      // ignore malformed persisted auth
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      if (location.pathname !== "/login") {
        location.assign("/login")
      }
    }
    return Promise.reject(error)
  }
)
