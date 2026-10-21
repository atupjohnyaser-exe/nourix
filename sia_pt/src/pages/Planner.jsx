import { useEffect, useState } from 'react'
import { searchMeals } from '../api'
import { useApp, DAYS, SLOTS, COLORS, slotLabel } from '../store.jsx'
import { Grade } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { suggestSlot } from '../slots.js'

const FULL = { Mon: 'MONDAY', Tue: 'TUESDAY', Wed: 'WEDNESDAY', Thu: 'THURSDAY', Fri: 'FRIDAY', Sat: 'SATURDAY', Sun: 'SUNDAY' }

export default function Planner() {
  const { plan, selected, setSelected, dayMeals, dayStat, avg, error, analysisFor, removeFromPlan, setOverride,
    grocery, items, done, checked, setChecked, isPro } = useApp()
  const [slot, setSlot] = useState(null)
  const [picking, setPicking] = useState(null)

  const meals = dayMeals(selected)
  const activeSlot = meals.some((x) => x.slot === slot) ? slot : meals[0]?.slot
  const current = activeSlot ? analysisFor(selected, activeSlot) : null
  const stat = dayStat(selected)
  const locked = !isPro && meals.length >= 1
  const firstEmpty = SLOTS.find((s) => !plan[selected]?.[s.key])?.key || 'dinner'

  return (
    <>
      <small>WEEK OF {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</small>
      <div className="head">
        <h1>Your week, <span className="grad">graded</span></h1>
        <div className="right">
          <div className="avg"><small>Week grade</small><b>{avg || '–'}</b></div>
          <button className="btn" onClick={() => setPicking({ day: selected, slot: firstEmpty })} disabled={locked}>+ Add meal</button>
        </div>
      </div>

      <div className="week">
        {DAYS.map((d) => {
          const st = dayStat(d)
          return (
            <button key={d} className={`day ${selected === d ? 'on' : ''} ${st ? '' : 'empty'}`} onClick={() => setSelected(d)}>
              <small>{d}</small>
              {st ? <><Grade g={st.grade} /><span>{st.count} meal{st.count > 1 ? 's' : ''}</span></> : <span>Plan it</span>}
            </button>
          )
        })}
      </div>

      {error && <p className="msg">{error}</p>}

      <div className="cols">
        <div className="stack">
          <div className="card">
            <div className="top">
              <div><small>{FULL[selected]}</small><h2 style={{ margin: '2px 0 0' }}>Day grade {stat?.grade ?? '–'}</h2></div>
              {stat?.score != null && <span className="conf">{stat.score} / 100 · average of {stat.count} meal{stat.count > 1 ? 's' : ''}</span>}
            </div>
            {SLOTS.map((s) => {
              const m = plan[selected]?.[s.key]
              if (!m) return locked
                ? <a key={s.key} className="slot add locked" href="#billing"><Icon name="lock" size={16} /> {s.label}: Pro only</a>
                : <button key={s.key} className="slot add" onClick={() => setPicking({ day: selected, slot: s.key })}><Icon name={s.icon} size={16} /> {s.label}: add a meal</button>
              const a = analysisFor(selected, s.key)
              const sug = suggestSlot(m)
              return (
                <div key={s.key} className={`slot ${activeSlot === s.key ? 'on' : ''}`}>
                  <span className="ico"><Icon name={s.icon} size={20} /></span>
                  {m.thumb && <img src={m.thumb} alt="" />}
                  <div className="info">
                    <small>{s.label}</small><b>{m.name}</b>
                    {sug.slot !== s.key && <small className="hint">Better at {slotLabel(sug.slot).toLowerCase()}</small>}
                  </div>
                  <Grade g={a?.grade} />
                  <button className="btn line" onClick={() => setSlot(s.key)}>Details</button>
                  <button className="btn line" aria-label={`Remove ${m.name}`} onClick={() => removeFromPlan(selected, s.key)}>Remove</button>
                </div>
              )
            })}
            {!isPro && <p className="hintbar">Free plan: 1 meal a day. <a href="#billing">Go Pro</a> for morning, lunch and dinner.</p>}
          </div>

          {!meals.length && <div className="card msg">Nothing planned for {selected}. Pick a time of day above to add a meal.</div>}
          {meals.length > 0 && !current && !error && <div className="card msg">Looking up nutrition…</div>}

          {current && (
            <>
              <div className="card hero">
                <div className="ring" style={{ background: `conic-gradient(${COLORS[current.grade]} ${current.score * 3.6}deg, rgba(255,255,255,.15) 0)` }}>
                  <div>{current.grade}</div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <small style={{ color: '#a7f3d0' }}>{slotLabel(activeSlot).toUpperCase()} · DISH GRADE</small>
                  <h2>{current.name}</h2>
                  <p>{current.tags.length ? current.tags.join(', ') + '.' : 'Nothing stands out.'}{current.swap && ' One swap could move it up.'}</p>
                  <span className="pill">{current.score} / 100</span>
                  {current.tags.map((t) => <span className="pill" key={t}>{t}</span>)}
                  <a className="pill link" href={`#recipe/${current.id}`}>View recipe</a>
                </div>
              </div>

              <div className="card">
                <div className="top"><small>NUTRITION PER SERVING</small><span className="conf">Confidence: {current.confidence}</span></div>
                <div className="stats">
                  {[['Protein', current.nutrition.protein, 'g', 60, '#10b981'], ['Sodium', current.nutrition.sodium, 'mg', 2300, '#ef4444'],
                    ['Sugar', current.nutrition.sugar, 'g', 50, '#f59e0b'], ['Fiber', current.nutrition.fiber, 'g', 30, '#14b8a6']].map(([n, v, u, max, c]) => (
                    <div className="stat" key={n}>
                      <small>{n}</small><b>{Number(v).toLocaleString()} {u}</b>
                      <div className="bar"><i style={{ width: Math.min(100, (v / max) * 100) + '%', background: c }} /></div>
                    </div>
                  ))}
                </div>
                <small>Estimates only. Amounts like "a pinch" or "2 cups" are converted to grams by guess.</small>
                <p className="lab">PROCESSING METER</p>
                <div className="meter">
                  <i style={{ flex: current.processing.whole || 0.1, background: '#10b981' }} />
                  <i style={{ flex: current.processing.processed || 0.1, background: '#f59e0b' }} />
                  <i style={{ flex: current.processing.ultra || 0.1, background: '#ef4444' }} />
                </div>
                <div className="top"><small>{current.processing.whole}% whole</small><small>{current.processing.processed}% processed</small><small>{current.processing.ultra}% ultra-processed</small></div>
              </div>

              <div className="card">
                <small>INGREDIENTS</small>
                {current.ingredients.map((i) => (
                  <div className="row" key={i.name}>
                    <div><b>{i.name}</b><br />{i.weak ? <small className="warn">Weak match, please check</small> : <small>Matched to {i.matched}</small>}</div>
                    <div className="right"><Grade g={i.grade} />
                      <button className="btn line" onClick={() => {
                        const t = prompt(`Search Open Food Facts for "${i.name}" as:`, i.name)
                        if (t) setOverride(selected, activeSlot, i.name, t)
                      }}>Fix this</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="stack">
          {current?.swap && isPro && (
            <div className="card swap">
              <small>SMART SWAP</small>
              <p>{current.swap.ingredient} is driving the sodium. Try {current.swap.term}.</p>
              <div className="arrow"><span><Grade g={current.swap.from} /> to <Grade g={current.swap.to} /></span><b>Dish: {current.grade} to {current.swap.meal_to}</b></div>
              <button className="btn full" onClick={() => setOverride(selected, activeSlot, current.swap.ingredient, current.swap.term)}>Apply swap</button>
            </div>
          )}
          {current && !isPro && (
            <div className="card lock"><b>Smart Swap is a Pro feature</b><p>Get healthier ingredient swaps and see how they change the grade.</p><a className="btn pro" href="#billing">Go Pro</a></div>
          )}
          <div className="card grocery">
            <div className="top"><small>GROCERY LIST</small><small>{done} of {items.length}</small></div>
            <div className="bar" style={{ margin: '8px 0' }}><i style={{ width: (items.length ? done / items.length * 100 : 0) + '%', background: '#10b981' }} /></div>
            {!items.length && <p className="msg">Add meals to build your list.</p>}
            {items.length > 0 && <a href="#grocery">Open the full list to record purchases</a>}
            {Object.entries(grocery).map(([aisle, list]) => list.length > 0 && (
              <div key={aisle}><h4>{aisle.toUpperCase()}</h4>
                {list.map((i) => (
                  <div className="gline" key={i.name}>{checked[i.name] ? <Icon name="check" size={14} /> : <span className="dot" />}<span className={checked[i.name] ? 'done' : ''}>{i.name}, {i.grams} g</span></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {picking && <Picker ctx={picking} onClose={() => setPicking(null)} />}
    </>
  )
}

function Picker({ ctx, onClose }) {
  const { addToPlan, setSelected } = useApp()
  const [slot, setSlot] = useState(ctx.slot)
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!q.trim()) return setRes(null)
    const t = setTimeout(() => searchMeals(q).then(setRes).catch(() => setRes([])), 350)
    return () => clearTimeout(t)
  }, [q])

  const pick = (m) => {
    const r = addToPlan(ctx.day, slot, m)
    if (!r.ok) return setErr(r.reason)
    setSelected(ctx.day); onClose()
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <div className="top"><b>Add a meal for {ctx.day}</b><button className="btn line" onClick={onClose}>Close</button></div>
        <div className="form" style={{ marginBottom: 0 }}>
          <select value={slot} onChange={(e) => { setSlot(e.target.value); setErr('') }} aria-label="Time of day">
            {SLOTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <input className="field" autoFocus placeholder="Search recipes, e.g. chicken" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {err && <p className="err">{err} <a href="#billing" onClick={onClose}>See Pro</a></p>}
        {res?.length === 0 && <p className="msg">No recipes found. Try another word.</p>}
        {res?.map((m) => {
          const sug = suggestSlot(m)
          return (
            <button className="res" key={m.id} onClick={() => pick(m)}>
              <img src={m.thumb} alt="" />
              <span><b>{m.name}</b><br /><small>{m.area} · best at {slotLabel(sug.slot).toLowerCase()}</small></span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
