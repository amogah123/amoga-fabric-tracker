import React, { useState } from 'react'
import { Factory } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { STAFF } from '../lib/staff'

export default function LoginPage({ onLogin }) {
  const [selectedEmail, setSelectedEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!selectedEmail) { setError('Select your name'); return }
    if (pin.length < 4) { setError('Enter your PIN'); return }
    setLoading(true); setError('')
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: selectedEmail, password: pin })
    setLoading(false)
    if (authErr) { setError('Wrong PIN. Try again.'); setPin(''); return }
    onLogin(data.session)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-icon"><Factory size={28} strokeWidth={2.25} /></div>
          <div className="login-title">AMOGA EXPORTS</div>
          <div className="login-sub">Fabric Reconciliation Tracker</div>
        </div>
        <div className="login-form">
          <label className="field">
            <span className="field-label">SELECT YOUR NAME</span>
            <select className="field-input login-select" value={selectedEmail}
              onChange={e => { setSelectedEmail(e.target.value); setError('') }}>
              <option value="">— Choose —</option>
              {STAFF.map(s => <option key={s.id} value={s.email}>{s.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">ENTER PIN</span>
            <input type="password" inputMode="numeric" maxLength={6}
              className="field-input login-pin" value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="• • • •" />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="btn-login" onClick={handleLogin} disabled={loading}>
            {loading ? 'Logging in…' : 'LOGIN'}
          </button>
        </div>
        <div className="login-footer">FABRIC DEPARTMENT · INTERNAL USE ONLY</div>
      </div>
    </div>
  )
}
