import { useState } from 'react'
import * as api from '../api'

export default function Reset() {
  const qs = new URLSearchParams(location.search)
  const token = qs.get('token'), email = qs.get('email')
  const [f, setF] = useState({ password: '', password_confirmation: '' })
  const [errs, setErrs] = useState({})
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!token || !email) return (
    <div className="card authbox"><h1>Reset password</h1>
      <p>This page needs the link from your email. <a href="#forgot">Request a new link</a></p></div>
  )
  if (done) return (
    <div className="card authbox"><h1>Password updated</h1><p>You can log in with your new password now.</p><a className="btn full" href="#login">Go to log in</a></div>
  )

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (f.password.length < 8 || !/[a-z]/i.test(f.password) || !/\d/.test(f.password)) found.password = 'At least 8 characters, with a letter and a number.'
    if (f.password !== f.password_confirmation) found.password_confirmation = 'Passwords do not match.'
    setErrs(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await api.resetPassword({ token, email, ...f })
      history.replaceState(null, '', location.pathname + '#reset')
      setDone(true)
    } catch (x) {
      const s = {}
      Object.entries(x.errors || {}).forEach(([k, v]) => (s[k] = v[0]))
      setErrs(Object.keys(s).length ? s : { email: x.message })
    }
    setBusy(false)
  }

  return (
    <div className="card authbox">
      <h1>Choose a new password</h1>
      <small>For {email}</small>
      <form onSubmit={submit} noValidate>
        {['password', 'password_confirmation'].map((k) => (
          <div className="fld" key={k}>
            <label htmlFor={k}>{k === 'password' ? 'New password' : 'Confirm new password'}</label>
            <input id={k} className="field" type="password" autoComplete="new-password" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={!!errs[k]} />
            {errs[k] && <small className="err">{errs[k]}</small>}
          </div>
        ))}
        {errs.email && <p className="err">{errs.email} <a href="#forgot">Request a new link</a></p>}
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </div>
  )
}
