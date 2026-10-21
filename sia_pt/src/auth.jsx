import { createContext, useContext, useEffect, useState } from 'react'
import * as api from './api'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!api.auth.get())

  const refresh = () => api.me().then(setUser).catch(() => { api.auth.set(null); setUser(null) })

  useEffect(() => {
    if (api.auth.get()) refresh().finally(() => setReady(true))
    const expired = () => { api.auth.set(null); setUser(null) }
    window.addEventListener('auth:expired', expired)
    return () => window.removeEventListener('auth:expired', expired)
  }, [])

  const signIn = async (fn, data) => {
    const r = await fn(data)
    api.auth.set(r.token); setUser(r.user)
  }
  const login = (d) => signIn(api.login, d)
  const register = (d) => signIn(api.register, d)
  const logout = async () => {
    try { await api.logout() } catch {}
    api.auth.set(null); api.clearCache(); setUser(null); location.hash = 'login'
  }

  return <Ctx.Provider value={{ user, ready, login, register, logout, refresh }}>{children}</Ctx.Provider>
}
