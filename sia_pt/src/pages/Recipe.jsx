import { useEffect, useState } from 'react'
import { getMeal } from '../api'
import { useApp, DAYS, SLOTS, slotLabel } from '../store.jsx'
import { useAuth } from '../auth.jsx'
import { suggestSlot } from '../slots.js'
import { Icon } from '../icons.jsx'

export default function Recipe({ arg }) {
  const { favorites, toggleFav, addToPlan, setSelected, isPro } = useApp()
  const { user } = useAuth()
  const [m, setM] = useState(null)
  const [state, setState] = useState('loading')
  const [day, setDay] = useState('Mon')
  const [slot, setSlot] = useState('dinner')
  const [note, setNote] = useState(null)

  useEffect(() => {
    setState('loading'); setNote(null)
    getMeal(arg)
      .then((r) => { setM(r); setSlot(suggestSlot(r).slot); setState('ok') })
      .catch((e) => setState(e.status === 404 ? 'missing' : 'error'))
  }, [arg])

  if (state === 'loading') return <p className="msg">Loading recipe…</p>
  if (state !== 'ok') return (
    <div className="card msg">{state === 'missing' ? 'That recipe was not found.' : 'Could not load the recipe. Check that the API is running.'}{' '}<a href="#recipes">Back to recipes</a></div>
  )

  const sug = suggestSlot(m)
  const steps = (m.instructions || '').split(/\r?\n/).map((s) => s.trim().replace(/^\d+[.)]\s*/, ''))
    .filter((s) => s.length > 2 && !/^step\s*\d+$/i.test(s))
  const fav = favorites.some((f) => f.id === m.id)

  const add = () => {
    const r = addToPlan(day, slot, m)
    if (!r.ok) return setNote({ bad: true, text: r.reason })
    setSelected(day); setNote({ text: `Added to ${day} ${slotLabel(slot).toLowerCase()}.` })
  }

  return (
    <>
      <a className="back" href="#recipes"><Icon name="arrowLeft" size={16} /> Back to recipes</a>
      <div className="rhero card">
        <img src={m.thumb} alt={m.name} />
        <div className="rinfo">
          <h1>{m.name}</h1>
          <div className="chips">
            {m.category && <span className="chip">{m.category}</span>}
            {m.area && <span className="chip">{m.area}</span>}
            {m.tags.map((t) => <span className="chip" key={t}>{t}</span>)}
          </div>
          <p className="meta">{m.ingredients.length} ingredients · {steps.length} steps</p>
          <div className="suggest"><b>Best for {slotLabel(sug.slot).toLowerCase()}</b><br /><small>{sug.why}</small></div>

          {user ? (
            <div className="mact" style={{ marginTop: 14 }}>
              <select value={day} onChange={(e) => { setDay(e.target.value); setNote(null) }} aria-label="Day">{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
              <select value={slot} onChange={(e) => { setSlot(e.target.value); setNote(null) }} aria-label="Time of day">
                {SLOTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <button className="btn" onClick={add}>Add to plan</button>
              <button className="btn line" aria-pressed={fav} onClick={() => toggleFav(m)}><Icon name="heart" size={16} fill={fav ? 'currentColor' : 'none'} /> {fav ? 'Saved' : 'Save'}</button>
            </div>
          ) : <p style={{ marginTop: 14 }}><a href="#login">Log in</a> to add this meal to your plan and see its health grade.</p>}
          {note && <p className={note.bad ? 'err' : 'okmsg'}>{note.text} {note.bad ? <a href="#billing">See Pro</a> : <a href="#planner">Open planner</a>}</p>}
          <p className="links">
            {m.youtube && <a href={m.youtube} target="_blank" rel="noreferrer"><Icon name="play" size={14} /> Watch the video</a>}
            {m.source && <a href={m.source} target="_blank" rel="noreferrer">Original recipe <Icon name="external" size={14} /></a>}
          </p>
        </div>
      </div>

      <div className="rcols">
        <div className="card">
          <small>INGREDIENTS</small>
          <ul className="ings">{m.ingredients.map((i) => <li key={i.name}><span>{i.name}</span><small>{i.measure}</small></li>)}</ul>
        </div>
        <div className="card">
          <small>STEPS</small>
          {steps.length ? <ol className="steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol> : <p className="msg">No instructions listed for this recipe.</p>}
        </div>
      </div>
    </>
  )
}
