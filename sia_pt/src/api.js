// Base URL is configurable so the same build works on any domain (set VITE_API_URL).
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const KEY = 'token'
export const auth = {
  get: () => localStorage.getItem(KEY),
  set: (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY)),
}
const cache = new Map()
export const clearCache = () => cache.clear()

async function request(method, path, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (auth.get()) headers.Authorization = 'Bearer ' + auth.get()
  try {
    const res = await fetch(BASE + path, { method, headers, signal: ctrl.signal, body: body ? JSON.stringify(body) : undefined })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      if (res.status === 401 && auth.get()) window.dispatchEvent(new Event('auth:expired'))
      const e = new Error(json?.message || `Request failed (${res.status})`)
      e.status = res.status
      e.errors = json?.errors || {}
      throw e
    }
    return json
  } finally { clearTimeout(timer) }
}

const cached = (path) => {
  if (cache.has(path)) return cache.get(path)
  const p = request('GET', path)
  p.catch(() => cache.delete(path))
  cache.set(path, p)
  return p
}

export const searchMeals = (q) => cached(`/meals/search?q=${encodeURIComponent(q)}`)
export const analyzeMeal = (id, overrides = {}) => {
  const qs = Object.entries(overrides).map(([k, v]) => `overrides[${encodeURIComponent(k)}]=${encodeURIComponent(v)}`).join('&')
  return cached(`/meals/${id}/analysis${qs ? '?' + qs : ''}`)
}
export const register = (d) => request('POST', '/register', d)
export const login = (d) => request('POST', '/login', d)
export const logout = () => request('POST', '/logout')
export const me = () => request('GET', '/me')
export const checkout = () => request('POST', '/checkout')
export const orders = () => request('GET', '/orders')
export const order = (ref) => request('GET', `/orders/${ref}`)
export const getMeal = (id) => cached(`/meals/${id}`)
export const forgotPassword = (email) => request('POST', '/forgot-password', { email })
export const resetPassword = (d) => request('POST', '/reset-password', d)
export const purchases = () => request('GET', '/purchases')
export const purchaseSummary = () => request('GET', '/purchases/summary')
export const addPurchase = (d) => request('POST', '/purchases', d)
export const deletePurchase = (id) => request('DELETE', `/purchases/${id}`)
export const suggestions = () => cached('/meals/suggestions')
export const byCategory = (c) => cached(`/meals/category/${encodeURIComponent(c)}`)
export const randomMeal = () => request('GET', '/meals/random')
export const saveFavorite = (m) => request('POST', '/favorites', m)
export const deleteFavorites = (ids) => request('DELETE', '/favorites', { ids })
