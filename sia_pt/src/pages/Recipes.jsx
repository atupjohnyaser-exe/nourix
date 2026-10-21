import { useEffect, useState } from 'react'
import * as api from '../api'
import { useApp, DAYS, SLOTS, slotLabel } from '../store.jsx'
import { useAuth } from '../auth.jsx'
import { suggestSlot } from '../slots.js'
import { PageHead } from '../ui.jsx'
import { Icon } from '../icons.jsx'

export function MealCard({ m, selectable, selected, onSelect }) {
  const { favorites, toggleFav, addToPlan, setSelected } = useApp()
  const { user } = useAuth()
  const sug = suggestSlot(m)
  const [day, setDay] = useState('Mon')
  const [slot, setSlot] = useState(sug.slot)
  const [note, setNote] = useState(null)
  const fav = favorites.some((f) => f.id === m.id)
  const add = () => {
    const r = addToPlan(day, slot, m)
    if (!r.ok) return setNote({ bad: true, text: r.reason })
    setSelected(day); setNote({ text: `Added to ${day} ${slotLabel(slot).toLowerCase()}` })
  }
  return (
    <div className={`mcard ${selected ? 'picked' : ''}`}>
      <div className="mimg">
        <a href={`#recipe/${m.id}`}><img src={m.thumb} alt="" loading="lazy" /></a>
        {selectable
          ? <label className="pick"><input type="checkbox" checked={!!selected} onChange={() => onSelect(m.id)} aria-label={`Select ${m.name}`} /></label>
          : user && <button className="heartbtn" aria-pressed={fav} aria-label={fav ? 'Remove from favorites' : 'Save to favorites'} onClick={() => toggleFav(m)}><Icon name="heart" size={18} fill={fav ? 'currentColor' : 'none'} /></button>}
      </div>
      <div className="mbody">
        <a className="mtitle" href={`#recipe/${m.id}`}><b>{m.name}</b></a>
        <small>{m.area ? m.area + ' · ' : ''}best at {slotLabel(sug.slot).toLowerCase()}</small>
        {user && (
          <div className="cardact">
            <div className="pair">
              <select value={day} onChange={(e) => { setDay(e.target.value); setNote(null) }} aria-label="Day">{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
              <select value={slot} onChange={(e) => { setSlot(e.target.value); setNote(null) }} aria-label="Time of day">{SLOTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
            </div>
            <button className="btn" onClick={add}>Add to plan</button>
          </div>
        )}
        {note && <small className={note.bad ? 'err' : 'okmsg'}>{note.text}</small>}
      </div>
    </div>
  )
}

export const MealGrid = ({ list, picked = [], ...rest }) => <div className="mgrid">{list.map((m) => <MealCard key={m.id} m={m} selected={picked.includes(m.id)} {...rest} />)}</div>

const CATS = ['Chicken', 'Beef', 'Seafood', 'Vegetarian', 'Pasta', 'Pork', 'Breakfast', 'Dessert']

function Section({ icon, title, note, meals }) {
  if (!meals?.length) return null
  return (
    <section>
      <div className="sh"><span className="si"><Icon name={icon} size={22} /></span><div><h2>{title}</h2><small>{note}</small></div></div>
      <MealGrid list={meals} />
    </section>
  )
}

export default function Recipes() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [res, setRes] = useState(null)
  const [state, setState] = useState('idle')
  const [sug, setSug] = useState(null)
  const [sugErr, setSugErr] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.suggestions().then(setSug).catch(() => setSugErr(true)) }, [])

  useEffect(() => {
    if (!q.trim()) { if (!cat) { setRes(null); setState('idle') } return }
    setState('loading')
    const t = setTimeout(() => api.searchMeals(q).then((r) => { setRes(r); setState('ok') }).catch(() => setState('error')), 350)
    return () => clearTimeout(t)
  }, [q])

  const pickCat = (c) => {
    if (cat === c) { setCat(''); setRes(null); setState('idle'); return }
    setQ(''); setCat(c); setState('loading')
    api.byCategory(c).then((r) => { setRes(r); setState('ok') }).catch(() => setState('error'))
  }
  const surprise = async () => {
    setBusy(true)
    try { const r = await api.randomMeal(); location.hash = 'recipe/' + r.id } catch { setBusy(false) }
  }

  const browsing = q.trim() || cat
  const weekNote = sug ? `Theme: ${sug.weekly.theme}. Changes every Monday.` : ''
  const n = sug?.popular.from_users || 0
  const popNote = n >= 6 ? 'The recipes NouriX users save the most.' : n > 0 ? 'Most saved by NouriX users, plus a few classics.' : 'Popular classics. This fills up with real favorites as people save recipes.'

  return (
    <>
      <div className="card rhead">
        <h1>What are we cooking?</h1>
        <p>Search a dish, pick a category, or let us choose for you.</p>
        <div className="rsearch">
          <div className="sbox"><Icon name="search" size={18} /><input className="field" placeholder="Try chicken, pasta, salmon" value={q} aria-label="Search recipes" onChange={(e) => { setQ(e.target.value); setCat('') }} /></div>
          <button className="btn pro" onClick={surprise} disabled={busy}><Icon name="shuffle" size={16} /> {busy ? 'Picking…' : 'Surprise me'}</button>
        </div>
      </div>

      <div className="cats" role="group" aria-label="Categories">
        {CATS.map((c) => <button key={c} className={`cat ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => pickCat(c)}>{c}</button>)}
      </div>

      {browsing ? (
        <>
          {cat && <div className="sh"><div><h2>{cat} recipes</h2></div></div>}
          {state === 'loading' && <p className="msg">Searching…</p>}
          {state === 'error' && <p className="msg">Something went wrong. Check that the API is running.</p>}
          {state === 'ok' && res.length === 0 && <p className="msg">No recipes found. Try another word.</p>}
          {state === 'ok' && res.length > 0 && <MealGrid list={res} />}
        </>
      ) : (
        <>
          {!sug && !sugErr && <p className="msg">Loading suggestions…</p>}
          {sugErr && <p className="msg">Could not load suggestions. You can still search above.</p>}
          {sug && <Section icon="star" title="This week's picks" note={weekNote} meals={sug.weekly.meals} />}
          {sug && <Section icon="heart" title="People's choice" note={popNote} meals={sug.popular.meals} />}
        </>
      )}
    </>
  )
}

export function Favorites() {
  const { favorites, removeFavorites } = useApp()
  const [sel, setSel] = useState([])
  const [confirm, setConfirm] = useState(false)

  const valid = sel.filter((id) => favorites.some((f) => f.id === id))
  const all = favorites.length > 0 && valid.length === favorites.length
  const toggle = (id) => { setConfirm(false); setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])) }
  const toggleAll = () => { setConfirm(false); setSel(all ? [] : favorites.map((f) => f.id)) }
  const remove = () => { removeFavorites(valid); setSel([]); setConfirm(false) }

  return (
    <>
      <PageHead title="Favorites" note={`${favorites.length} saved`} />
      {favorites.length > 0 && (
        <div className="card bulkbar">
          <label className="allbox"><input type="checkbox" checked={all} onChange={toggleAll} /> {all ? 'Deselect all' : 'Select all'}</label>
          <span className="count">{valid.length} selected</span>
          {confirm ? (
            <>
              <span>Remove {valid.length}?</span>
              <button className="btn danger" onClick={remove}>Yes, remove</button>
              <button className="btn line" onClick={() => setConfirm(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn danger" disabled={!valid.length} onClick={() => setConfirm(true)}><Icon name="trash" size={16} /> Remove selected</button>
          )}
        </div>
      )}
      {favorites.length ? <MealGrid list={favorites} selectable picked={valid} onSelect={toggle} />
        : <p className="msg">Nothing saved yet. Tap the heart on any recipe.</p>}
    </>
  )
}
