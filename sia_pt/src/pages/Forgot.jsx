import { useState } from 'react'
import * as api from '../api'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email.')
    setErr(''); setState('busy')
    try { await api.forgotPassword(email); setState('sent') }
    catch (x) { setErr(x.errors?.email?.[0] || x.message); setState('idle') }
  }

  return (
    <div className="card authbox">
      <h1>Forgot password</h1>
      {state === 'sent' ? (
        <>
          <p>If that email is registered, we sent a reset link. It expires in 60 minutes. Check your inbox and spam folder.</p>
          <a className="btn full" href="#login">Back to log in</a>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="msg" style={{ padding: 0 }}>Enter your email and we will send you a link to choose a new password.</p>
          <div className="fld">
            <label htmlFor="fe">Email</label>
            <input id="fe" className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} />
            {err && <small className="err">{err}</small>}
          </div>
          <button className="btn full" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send reset link'}</button>
          <p style={{ marginBottom: 0 }}><a href="#login">Back to log in</a></p>
        </form>
      )}
    </div>
  )
}
