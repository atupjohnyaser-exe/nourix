import { useEffect, useState } from 'react'
import * as api from '../api'
import { useAuth } from '../auth.jsx'
import { PageHead } from '../ui.jsx'

const peso = (c) => '₱' + (c / 100).toFixed(2)

export default function Billing() {
  const { user, refresh } = useAuth()
  const [orders, setOrders] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => api.orders().then(setOrders).catch(() => setOrders([]))

  useEffect(() => {
    load()
    const qs = new URLSearchParams(location.search)
    const ref = qs.get('ref')
    if (!ref) return
    let timer, tries = 0, stop = false
    const clean = () => history.replaceState(null, '', location.pathname + '#billing')
    if (qs.get('cancelled')) {
      setMsg({ bad: true, text: 'Payment was cancelled or declined. You were not charged. You can try again.' })
      clean(); return
    }
    setMsg({ text: 'Checking your payment…' })
    const tick = async () => {
      if (stop) return
      try {
        const o = await api.order(ref)
        if (o.status === 'paid') { setMsg({ ok: true, text: 'Payment received. Thank you!' }); refresh(); load(); clean(); return }
        if (o.status === 'failed' || o.status === 'expired') { setMsg({ bad: true, text: 'Payment failed. You were not charged. Please try again.' }); load(); clean(); return }
      } catch {}
      if (++tries < 10) timer = setTimeout(tick, 3000)
      else setMsg({ text: 'Still waiting for confirmation. Refresh in a minute.' })
    }
    tick()
    return () => { stop = true; clearTimeout(timer) }
  }, [])

  const pay = async () => {
    setBusy(true); setMsg(null)
    try { const r = await api.checkout(); location.href = r.checkout_url }
    catch (e) { setMsg({ bad: true, text: e.message }); setBusy(false) }
  }

  return (
    <>
      <PageHead title="NouriX Pro" note={user.is_pro ? 'You are on Pro' : 'Unlock the full planner'} />
      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="card"><small>FREE</small><h2 style={{ margin: '4px 0' }}>₱0</h2>
          <ul className="perks"><li>1 meal per day</li><li>Health grade and nutrition for every dish</li><li>Recipes, favorites and pantry</li><li>Grocery list with your own prices</li><li>Dashboard summary</li></ul>
          {!user.is_pro && <span className="chip">Your plan</span>}</div>
        <div className="card proplan"><small>PRO</small><h2 style={{ margin: '4px 0' }}>₱149 / month</h2>
          <ul className="perks"><li>3 meals per day: morning, lunch and dinner</li><li>Smart Swap suggestions</li><li>Automatic grocery prices and budget</li><li>Dashboard charts and weekly alerts</li></ul>
          {user.is_pro && <span className="chip">Your plan</span>}</div>
      </div>
      {msg && <div className={`card note ${msg.ok ? 'ok' : msg.bad ? 'bad' : ''}`}>{msg.text}</div>}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="top"><div><b>NouriX Pro, 1 month</b><br /><small>Test mode. Use PayMongo's test card 4343 4343 4343 4345 with any future expiry and any CVC.</small></div><b style={{ fontSize: 22 }}>₱149.00</b></div>
        <button className="btn full" style={{ marginTop: 14 }} onClick={pay} disabled={busy || user.is_pro}>{user.is_pro ? 'You are on Pro' : busy ? 'Opening PayMongo…' : 'Pay with PayMongo'}</button>
      </div>
      <div className="card">
        <small>YOUR ORDERS</small>
        {orders === null && <p className="msg">Loading…</p>}
        {orders?.length === 0 && <p className="msg">No orders yet.</p>}
        {orders?.map((o) => (
          <div className="li" key={o.id}>
            <span>{o.description}<br /><small>{new Date(o.created_at).toLocaleString()}</small></span>
            <span><b>{peso(o.amount)}</b> <span className={`pill2 ${o.status}`}>{o.status}</span></span>
          </div>
        ))}
      </div>
    </>
  )
}
