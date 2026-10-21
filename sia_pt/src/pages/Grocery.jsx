import { useEffect, useState } from 'react'
import * as api from '../api'
import { useApp } from '../store.jsx'
import { PageHead, ChartBox } from '../ui.jsx'

const fmt = (n) => '₱' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
const bars = (rows, color) => ({ labels: rows.map((r) => r.label), datasets: [{ label: 'Spent', data: rows.map((r) => r.total), backgroundColor: color, borderRadius: 6 }] })
const noLegend = { plugins: { legend: { display: false } } }

export default function Grocery() {
  const { grocery, items, checked, setChecked, prices, setPrices, done, isPro } = useApp()
  const [sum, setSum] = useState(null)
  const [history, setHistory] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')

  const load = () => Promise.all([api.purchaseSummary(), api.purchases()])
    .then(([s, h]) => { setSum(s); setHistory(h); setErr('') })
    .catch(() => setErr('Could not load your spending. Check that the API is running.'))
  useEffect(() => { load() }, [])

  // Pro: estimated prices fill in by themselves. Free: type your own.
  const priceOf = (i) => (prices[i.name] !== undefined ? parseFloat(prices[i.name]) || 0 : isPro ? i.est : 0)
  const total = items.reduce((s, i) => s + priceOf(i), 0)
  const spentNow = items.filter((i) => checked[i.name]).reduce((s, i) => s + priceOf(i), 0)

  // Ticking an item records a purchase for today. Unticking removes it.
  const toggle = async (i) => {
    setBusy(i.name); setErr('')
    try {
      if (checked[i.name]) {
        await api.deletePurchase(checked[i.name]).catch((e) => { if (e.status !== 404) throw e })
        const c = { ...checked }; delete c[i.name]; setChecked(c)
      } else {
        const p = await api.addPurchase({ name: i.name, aisle: i.aisle, grams: i.grams, price: priceOf(i) })
        setChecked({ ...checked, [i.name]: p.id })
      }
      await load()
    } catch { setErr('Could not save that purchase. Try again.') }
    setBusy('')
  }
  const removeRecord = async (id) => {
    await api.deletePurchase(id).catch(() => {})
    setChecked(Object.fromEntries(Object.entries(checked).filter(([, v]) => v !== id)))
    load()
  }

  return (
    <>
      <PageHead title="Grocery and spending" note={`${done} of ${items.length} items bought this list`} />
      {err && <p className="err">{err}</p>}

      <div className="kpis">
        <div className="kpi"><small>Spent today</small><b>{fmt(sum?.today)}</b></div>
        <div className="kpi"><small>This week</small><b>{fmt(sum?.week)}</b><small>about {fmt(sum?.avg_day_week)} a day</small></div>
        <div className="kpi"><small>This month</small><b>{fmt(sum?.month)}</b><small>about {fmt(sum?.avg_day_month)} a day</small></div>
        <div className="kpi"><small>This list</small><b>{fmt(spentNow)}</b><small>of {fmt(total)} estimated</small></div>
      </div>

      {!isPro && items.length > 0 && (
        <div className="card lock" style={{ marginTop: 14 }}><b>Automatic prices are Pro</b>
          <p>Pro fills in an estimated price for every item. On Free, type a price before you tick an item so it counts in your spending.</p>
          <a className="btn pro" href="#billing">Go Pro</a></div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="top"><small>SHOPPING LIST</small><button className="btn line" onClick={() => setChecked({})}>Start a new list</button></div>
        {!items.length && <p className="msg">Plan some meals first. Duplicates across the week are merged here.</p>}
        {items.length > 0 && <p className="msg" style={{ padding: '8px 0' }}>Tick an item when you buy it. It is saved to today's spending. Untick it to remove it.{isPro && ' Prices are rough Philippine estimates, so edit them to match your receipt before you tick.'}</p>}
        {Object.entries(grocery).map(([aisle, list]) => list.length > 0 && (
          <div className="grocery" key={aisle}>
            <h4>{aisle.toUpperCase()}</h4>
            {list.map((i) => (
              <div className="li" key={i.name}>
                <label><input type="checkbox" disabled={busy === i.name} checked={!!checked[i.name]} onChange={() => toggle(i)} /> {i.name}, {i.grams} g</label>
                <input className="field price" inputMode="decimal" placeholder="₱ price" aria-label={`Price for ${i.name}`}
                  disabled={!!checked[i.name]} title={checked[i.name] ? 'Untick to change the price' : ''}
                  value={prices[i.name] ?? (isPro ? i.est : '')} onChange={(e) => setPrices({ ...prices, [i.name]: e.target.value })} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {sum && (
        <div className="grid3">
          <div className="card"><small>EACH DAY (LAST 7 DAYS)</small><div className="chart sm"><ChartBox data={bars(sum.days, '#10b981')} options={noLegend} /></div></div>
          <div className="card"><small>EACH WEEK (LAST 4 WEEKS)</small><div className="chart sm"><ChartBox data={bars(sum.weeks, '#14b8a6')} options={noLegend} /></div></div>
          <div className="card"><small>EACH MONTH (LAST 6 MONTHS)</small><div className="chart sm"><ChartBox data={bars(sum.months, '#f59e0b')} options={noLegend} /></div></div>
        </div>
      )}

      <div className="card">
        <small>RECENT PURCHASES</small>
        {history.length === 0 && <p className="msg">Nothing recorded yet. Tick an item above when you buy it.</p>}
        {history.map((p) => (
          <div className="li" key={p.id}>
            <span><b>{p.name}</b><br /><small>{new Date(p.bought_on + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {p.grams} g</small></span>
            <span className="right"><b>{fmt(p.price)}</b><button className="btn line" onClick={() => removeRecord(p.id)}>Remove</button></span>
          </div>
        ))}
      </div>
    </>
  )
}
