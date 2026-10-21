import { createContext, useContext, useEffect, useState } from 'react'
import { analyzeMeal, clearCache, saveFavorite, deleteFavorites } from './api'
import { useAuth } from './auth.jsx'
import { estimate } from './prices.js'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const SLOTS = [
  { key: 'breakfast', label: 'Morning', icon: 'sunrise' },
  { key: 'lunch', label: 'Lunch', icon: 'sun' },
  { key: 'dinner', label: 'Dinner', icon: 'moon' },
]
export const slotLabel = (k) => SLOTS.find((s) => s.key === k)?.label
export const COLORS = { A: '#10b981', B: '#f59e0b', C: '#f97316', D: '#ef4444' }
export const letter = (s) => (s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : 'D')

const useStored = (key, init) => {
  const [v, setV] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? init } catch { return init }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, [key, v])
  return [v, setV]
}

// old plans stored one meal per day; move them to dinner
const migrate = () => {
  try {
    const old = JSON.parse(localStorage.getItem('plan')) || {}
    return Object.fromEntries(Object.entries(old).map(([d, m]) => [d, m && m.id ? { dinner: m } : {}]))
  } catch { return {} }
}

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const { user } = useAuth()
  const isPro = !!user?.is_pro
  const [plan, setPlan] = useStored('plan2', migrate())
  const [checked, setChecked] = useStored('bought2', {})
  const [prices, setPrices] = useStored('prices', {})
  const [favorites, setFavorites] = useStored('favorites', [])
  const [pantry, setPantry] = useStored('pantry', [])
  const [selected, setSelected] = useState(DAYS[(new Date().getDay() + 6) % 7])
  const [data, setData] = useState({})
  const [error, setError] = useState('')

  const keyOf = (m) => m.id + '|' + JSON.stringify(m.overrides || {}) + '|' + (isPro ? 1 : 0)
  const allMeals = Object.values(plan).flatMap((d) => Object.values(d || {}))

  useEffect(() => { clearCache() }, [isPro]) // plan changes what the API returns (swaps)

  useEffect(() => {
    if (!user) return
    allMeals.forEach((m) => {
      const k = keyOf(m)
      if (data[k]) return
      analyzeMeal(m.id, m.overrides)
        .then((r) => { setError(''); setData((d) => ({ ...d, [k]: r })) })
        .catch(() => setError('Could not load nutrition data. Check that the API is running.'))
    })
  }, [plan, user, isPro])

  const analysisFor = (day, slot) => { const m = plan[day]?.[slot]; return m ? data[keyOf(m)] : null }
  const dayMeals = (day) => SLOTS.filter((s) => plan[day]?.[s.key])
    .map((s) => ({ slot: s.key, label: s.label, m: plan[day][s.key], a: analysisFor(day, s.key) }))

  // A day's grade is the average score of the meals planned that day.
  // Each dish keeps its own grade.
  const dayStat = (day) => {
    const ms = dayMeals(day)
    if (!ms.length) return null
    const done = ms.filter((x) => x.a)
    if (!done.length) return { count: ms.length }
    const score = Math.round(done.reduce((s, x) => s + x.a.score, 0) / done.length)
    const totals = { protein: 0, sodium: 0, sugar: 0, fiber: 0, kcal: 0 }
    done.forEach((x) => Object.keys(totals).forEach((k) => (totals[k] += x.a.nutrition[k] || 0)))
    return { count: ms.length, score, grade: letter(score), totals }
  }

  const scored = DAYS.map(dayStat).filter((s) => s?.score != null)
  const weekScore = scored.length ? scored.reduce((a, s) => a + s.score, 0) / scored.length : null
  const avg = weekScore == null ? null : letter(weekScore) + (weekScore % 10 >= 6.7 && weekScore < 100 ? '+' : weekScore % 10 < 3.3 && weekScore < 85 ? '-' : '')

  const addToPlan = (day, slot, m) => {
    const others = Object.keys(plan[day] || {}).filter((k) => k !== slot).length
    if (!isPro && others >= 1) return { ok: false, reason: 'The Free plan allows 1 meal per day. Go Pro to plan morning, lunch and dinner.' }
    setPlan((p) => ({ ...p, [day]: { ...(p[day] || {}), [slot]: { id: m.id, name: m.name, thumb: m.thumb, category: m.category, overrides: {} } } }))
    return { ok: true }
  }
  const removeFromPlan = (day, slot) => setPlan((p) => { const d = { ...(p[day] || {}) }; delete d[slot]; return { ...p, [day]: d } })
  const setOverride = (day, slot, name, term) => setPlan((p) => ({ ...p, [day]: { ...p[day], [slot]: { ...p[day][slot], overrides: { ...(p[day][slot].overrides || {}), [name]: term } } } }))
  // Favorites live in this browser, and a copy goes to Laravel so "People's choice" can count saves.
  const toggleFav = (m) => {
    const had = favorites.some((x) => x.id === m.id)
    setFavorites((f) => (had ? f.filter((x) => x.id !== m.id) : [...f, { id: m.id, name: m.name, thumb: m.thumb, area: m.area || null }]))
    if (user) (had ? deleteFavorites([m.id]) : saveFavorite({ id: m.id, name: m.name, thumb: m.thumb || null, area: m.area || null })).catch(() => {})
  }
  const removeFavorites = (ids) => {
    setFavorites((f) => f.filter((x) => !ids.includes(x.id)))
    if (user && ids.length) deleteFavorites(ids).catch(() => {})
  }

  const out = {}
  const grocery = { Produce: [], Protein: [], Pantry: [] }
  DAYS.forEach((d) => SLOTS.forEach((s) => analysisFor(d, s.key)?.ingredients.forEach((i) => {
    const k = i.name.toLowerCase()
    out[k] = out[k] || { name: i.name, aisle: i.aisle, grams: 0 }
    out[k].grams += i.grams
  })))
  Object.values(out).forEach((i) => { i.est = estimate(i.name, i.aisle, i.grams); grocery[i.aisle].push(i) })
  const items = Object.values(grocery).flat()
  const done = items.filter((i) => checked[i.name]).length

  return (
    <Ctx.Provider value={{ plan, checked, setChecked, prices, setPrices, favorites, pantry, setPantry, selected, setSelected,
      error, isPro, analysisFor, dayMeals, dayStat, avg, addToPlan, removeFromPlan, setOverride, toggleFav, removeFavorites, grocery, items, done }}>
      {children}
    </Ctx.Provider>
  )
}
