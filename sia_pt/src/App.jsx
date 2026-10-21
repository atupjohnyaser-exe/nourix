import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth.jsx'
import { AppProvider } from './store.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Planner from './pages/Planner.jsx'
import Recipes, { Favorites } from './pages/Recipes.jsx'
import Recipe from './pages/Recipe.jsx'
import Grocery from './pages/Grocery.jsx'
import Pantry from './pages/Pantry.jsx'
import Billing from './pages/Billing.jsx'
import AuthPage from './pages/Auth.jsx'
import Forgot from './pages/Forgot.jsx'
import Reset from './pages/Reset.jsx'
import { Icon, Logo } from './icons.jsx'

// access: 'public' = anyone, 'auth' = logged in only, 'guest' = logged out only
const Login = () => <AuthPage mode="login" />
const Register = () => <AuthPage mode="register" />
const PAGES = {
  home: ['Home', Landing, 'guest'], // full-page intro for visitors
  dashboard: ['Dashboard', Dashboard, 'auth'],
  planner: ['Planner', Planner, 'auth'],
  recipes: ['Recipes', Recipes, 'public'],
  recipe: ['Recipe', Recipe, 'public'], // opened as #recipe/52795
  grocery: ['Grocery', Grocery, 'auth'],
  pantry: ['Pantry', Pantry, 'auth'],
  favorites: ['Favorites', Favorites, 'auth'],
  billing: ['Pro', Billing, 'auth'],
  login: ['Log in', Login, 'guest'],
  register: ['Register', Register, 'guest'],
  forgot: ['Forgot password', Forgot, 'guest'],
  reset: ['Reset password', Reset, 'guest'],
}
const NOT_IN_MENU = ['recipe', 'forgot', 'reset']

// "#recipe/52795" -> { page: 'recipe', arg: '52795' }. Unknown or empty goes to home.
const useHash = () => {
  const read = () => {
    const [p, arg] = location.hash.slice(1).split('/')
    return { page: p in PAGES ? p : 'home', arg }
  }
  const [h, setH] = useState(read)
  useEffect(() => {
    const f = () => { setH(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return h
}

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  const toggle = () => {
    const t = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = t
    try { localStorage.setItem('theme', t) } catch {}
    setTheme(t)
    window.dispatchEvent(new Event('themechange'))
  }
  return [theme, toggle]
}

function Shell() {
  const { user, ready, logout } = useAuth()
  const { page, arg } = useHash()
  const [theme, toggleTheme] = useTheme()
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [page, arg])
  const [, Page, access] = PAGES[page]

  if (!ready) return <p className="msg" style={{ padding: 24 }}>Loading…</p>
  if (page === 'home' && !user) return <Landing theme={theme} toggleTheme={toggleTheme} />

  let view = <Page arg={arg} />
  if (access === 'auth' && !user) view = <AuthPage mode="login" notice="Please log in to continue." />
  else if (access === 'guest' && user) view = <Dashboard />

  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <nav className={`nav ${open ? 'open' : ''}`} aria-label="Main">
        <div className="navhead">
          <b className="brand"><Logo size={30} /><span>NouriX</span></b>
          <button className="menubtn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'x' : 'menu'} size={22} />
          </button>
        </div>
        <div className="navlinks">
          {Object.entries(PAGES)
            .filter(([k]) => !NOT_IN_MENU.includes(k))
            .filter(([k, [, , a]]) => (k === 'home' ? !user : a === 'guest' ? !user : a === 'public' || user))
            .map(([k, [label]]) => (
              <a key={k} href={`#${k}`} className={page === k || (k === 'recipes' && page === 'recipe') || (k === 'dashboard' && page === 'home') ? 'on' : ''}>{label}</a>
            ))}
          <button className="theme" onClick={toggleTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} /> {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          {user && <a href="#billing" className={`plan ${user.is_pro ? 'pro' : ''}`}>{user.is_pro ? <><Icon name="star" size={13} fill="currentColor" /> PRO</> : 'FREE · Upgrade'}</a>}
          {user && <button className="who" onClick={logout}>Log out ({user.name.split(' ')[0]})</button>}
        </div>
      </nav>
      <main>{view}</main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppProvider><Shell /></AppProvider></AuthProvider>
}
