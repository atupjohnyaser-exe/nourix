import { useApp, DAYS, COLORS } from '../store.jsx'
import { useAuth } from '../auth.jsx'
import { ChartBox, Grade } from '../ui.jsx'

export default function Dashboard() {
  const { user } = useAuth()
  const { dayStat, avg, isPro, error, plan } = useApp()
  const rows = DAYS.map((d) => ({ d, s: dayStat(d) }))
  const have = rows.filter((r) => r.s?.score != null)
  const planned = rows.reduce((n, r) => n + (r.s?.count || 0), 0)
  const first = user.name.split(' ')[0]

  const head = (
    <div className="head"><div>
      <small>YOUR DASHBOARD</small>
      <h1>Hi {first}, here's your <span className="grad">week</span></h1>
    </div></div>
  )

  if (!have.length) return (
    <>{head}<div className="card msg">{error || <>No meals graded yet. <a href="#recipes">Find a recipe</a> or open the <a href="#planner">planner</a> to start.</>}</div></>
  )

  const mean = (k) => Math.round(have.reduce((s, r) => s + r.s.totals[k], 0) / have.length)
  const variety = new Set(Object.values(plan).flatMap((d) => Object.values(d || {}).map((m) => m.id))).size
  const flags = [
    ...have.filter((r) => r.s.totals.protein < 50).map((r) => `${r.d}: low protein (${Math.round(r.s.totals.protein)} g in the day)`),
    ...have.filter((r) => r.s.totals.sodium > 2300).map((r) => `${r.d}: high sodium (${Math.round(r.s.totals.sodium).toLocaleString()} mg)`),
    ...have.filter((r) => r.s.totals.sugar > 50).map((r) => `${r.d}: high sugar (${Math.round(r.s.totals.sugar)} g)`),
  ]
  const val = (k) => rows.map((r) => (r.s?.totals ? Math.round(r.s.totals[k]) : null))

  return (
    <>
      {head}
      <div className="kpis">
        <div className="kpi"><small>Week grade</small><b>{avg}</b></div>
        <div className="kpi"><small>Meals planned</small><b>{planned}<span className="of"> / {isPro ? 21 : 7}</span></b></div>
        <div className="kpi"><small>Protein per day</small><b>{mean('protein')} g</b></div>
        <div className="kpi"><small>Sodium per day</small><b>{mean('sodium').toLocaleString()} mg</b></div>
        <div className="kpi"><small>Sugar per day</small><b>{mean('sugar')} g</b></div>
        <div className="kpi"><small>Variety</small><b>{variety}<span className="of"> dishes</span></b></div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <small>DAY GRADES · each day is the average of its meals</small>
        <div className="daychips">
          {rows.map((r) => (
            <div className="dchip" key={r.d}><small>{r.d}</small>{r.s?.grade ? <Grade g={r.s.grade} /> : <span className="dash">–</span>}<small>{r.s?.score ?? ''}</small></div>
          ))}
        </div>
      </div>

      {isPro ? (
        <>
          {flags.length > 0 && <div className="card" style={{ marginTop: 14 }}><small>HEADS UP</small>{flags.map((f) => <p key={f} className="flag">{f}</p>)}</div>}
          <div className="grid2">
            <div className="card"><small>DAY SCORE</small>
              <ChartBox data={{ labels: DAYS, datasets: [{ label: 'Score', data: rows.map((r) => r.s?.score ?? null), backgroundColor: rows.map((r) => COLORS[r.s?.grade] || '#d1d5db'), borderRadius: 8 }] }}
                options={{ plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }} />
            </div>
            <div className="card"><small>DAILY PROTEIN AND SUGAR (g)</small>
              <ChartBox data={{ labels: DAYS, datasets: [
                { label: 'Protein', data: val('protein'), backgroundColor: '#10b981', borderRadius: 6 },
                { label: 'Sugar', data: val('sugar'), backgroundColor: '#f59e0b', borderRadius: 6 }] }} />
            </div>
          </div>
        </>
      ) : (
        <div className="card lock" style={{ marginTop: 14 }}>
          <b>Charts and weekly alerts are Pro</b>
          <p>See score and nutrition charts for each day, plus warnings like low protein or high sodium.</p>
          <a className="btn pro" href="#billing">Go Pro</a>
        </div>
      )}
    </>
  )
}
