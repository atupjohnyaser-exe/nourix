import { useState } from 'react'
import { useAuth } from '../auth.jsx'

const RULES = {
  name: (v) => (v.trim().length < 2 ? 'Enter your full name.' : ''),
  email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? '' : 'Enter a valid email.'),
  contact_number: (v) => (/^(09|\+639)\d{9}$/.test(v) ? '' : 'Use a PH mobile number like 09171234567.'),
  password: (v) => (v.length < 8 || !/[a-z]/i.test(v) || !/\d/.test(v) ? 'At least 8 characters, with a letter and a number.' : ''),
}

export default function AuthPage({ mode, notice }) {
  const { login, register } = useAuth()
  const isReg = mode === 'register'
  const [f, setF] = useState({ name: '', email: '', contact_number: '', password: '', password_confirmation: '' })
  const [errs, setErrs] = useState({})
  const [busy, setBusy] = useState(false)
  const [top, setTop] = useState('')

  const fields = isReg ? ['name', 'email', 'contact_number', 'password', 'password_confirmation'] : ['email', 'password']
  const label = { name: 'Full name', email: 'Email', contact_number: 'Contact number', password: 'Password', password_confirmation: 'Confirm password' }

  const check = (k, v = f[k]) => (k === 'password_confirmation' ? (v === f.password ? '' : 'Passwords do not match.')
    : k === 'password' && !isReg ? (v ? '' : 'Enter your password.') : RULES[k](v))

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    fields.forEach((k) => { const m = check(k); if (m) found[k] = m })
    setErrs(found); setTop('')
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await (isReg ? register(f) : login({ email: f.email, password: f.password }))
      location.hash = 'dashboard'
    } catch (err) {
      const server = {}
      Object.entries(err.errors || {}).forEach(([k, v]) => (server[k] = v[0]))
      setErrs(server)
      if (!Object.keys(server).length) setTop(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="card authbox">
      <h1>{isReg ? 'Create account' : 'Log in'}</h1>
      {notice && <p className="msg" style={{ padding: 0 }}>{notice}</p>}
      <form onSubmit={submit} noValidate>
        {fields.map((k) => (
          <div className="fld" key={k}>
            <label htmlFor={k}>{label[k]}</label>
            <input id={k} className="field" type={k.startsWith('password') ? 'password' : k === 'email' ? 'email' : 'text'}
              autoComplete={k === 'password' ? (isReg ? 'new-password' : 'current-password') : k === 'email' ? 'email' : 'off'}
              value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
              onBlur={() => setErrs((s) => ({ ...s, [k]: check(k) }))} aria-invalid={!!errs[k]} />
            {errs[k] && <small className="err">{errs[k]}</small>}
          </div>
        ))}
        {!isReg && <p style={{ margin: '0 0 14px' }}><a href="#forgot">Forgot password?</a></p>}
        {top && <p className="err">{top}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Please wait…' : isReg ? 'Register' : 'Log in'}</button>
      </form>
      <p style={{ marginBottom: 0 }}>{isReg ? <>Have an account? <a href="#login">Log in</a></> : <>New here? <a href="#register">Create an account</a></>}</p>
    </div>
  )
}
