import { useState } from 'react'
import { searchMeals } from '../api'
import { useApp } from '../store.jsx'
import { PageHead } from '../ui.jsx'
import { MealGrid } from './Recipes.jsx'

export default function Pantry() {
  const { pantry, setPantry } = useApp()
  const [f, setF] = useState({ name: '', qty: '', exp: '' })
  const [found, setFound] = useState(null) // { for, list }
  const [busy, setBusy] = useState(false)

  const add = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    setPantry([...pantry, { id: Date.now(), ...f, name: f.name.trim() }])
    setF({ name: '', qty: '', exp: '' })
  }
  const soon = (d) => d && (new Date(d) - Date.now()) / 864e5 <= 3

  const find = async (name) => {
    setBusy(true)
    try { setFound({ for: name, list: await searchMeals(name) }) } catch { setFound({ for: name, list: [] }) }
    setBusy(false)
  }

  return (
    <>
      <PageHead title="Pantry" note="What you already have" />
      <form className="form" onSubmit={add}>
        <input className="field" placeholder="Item, e.g. chicken" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="field" placeholder="Quantity" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
        <input className="field" type="date" aria-label="Expiry date" value={f.exp} onChange={(e) => setF({ ...f, exp: e.target.value })} />
        <button className="btn">Add item</button>
      </form>
      <div className="card">
        {!pantry.length && <p className="msg">Your pantry is empty.</p>}
        {pantry.map((p) => (
          <div className="li" key={p.id}>
            <span><b>{p.name}</b> {p.qty && <small>{p.qty}</small>}{p.exp && <small className={soon(p.exp) ? 'soon' : ''}> · expires {p.exp}</small>}</span>
            <span className="mact">
              <button className="btn line" onClick={() => find(p.name)}>Find recipes</button>
              <button className="btn line" onClick={() => setPantry(pantry.filter((x) => x.id !== p.id))}>Remove</button>
            </span>
          </div>
        ))}
      </div>
      {busy && <p className="msg">Searching…</p>}
      {found && !busy && (
        <div style={{ marginTop: 16 }}>
          <p><b>Recipes with {found.for}</b></p>
          {found.list.length ? <MealGrid list={found.list} /> : <p className="msg">No recipes found for that item.</p>}
        </div>
      )}
    </>
  )
}
