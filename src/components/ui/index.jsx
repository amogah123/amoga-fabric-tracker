import React, { useState } from 'react'
import { Lock, Unlock, AlertTriangle } from 'lucide-react'

export function StatusPill({ status }) {
  return (
    <span className={`pill pill-${status.color}`}>
      <span className="pill-dot" />{status.label}
    </span>
  )
}

export function Tile({ label, value, sub, tone, Icon }) {
  return (
    <div className={`tile tile-${tone}`}>
      <div className="tile-icon"><Icon size={18} /></div>
      <div className="tile-val">{value}</div>
      <div className="tile-label">{label}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  )
}

export function Field({ label, value, onChange, type = 'text', readOnly, mono, placeholder }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type={type} value={value ?? ''} readOnly={readOnly} placeholder={placeholder}
        onChange={e => onChange && onChange(e.target.value)}
        className={`field-input ${mono ? 'mono' : ''} ${readOnly ? 'readonly' : ''}`}
      />
    </label>
  )
}

export function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="field-input" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </label>
  )
}

export function InfoCard({ title, children, action }) {
  return (
    <div className="info-card">
      <div className="info-title"><span>{title}</span>{action}</div>
      <div className="info-body">{children}</div>
    </div>
  )
}

export function KV({ k, v }) {
  return <div className="kv"><span className="kv-k">{k}</span><span className="kv-v">{v ?? '—'}</span></div>
}

export function Toast({ message, visible }) {
  if (!visible) return null
  return <div className="toast"><span className="toast-icon">✓</span> {message}</div>
}

let toastTimer = null
export function useToast() {
  const [toast, setToast] = useState({ message: '', visible: false })
  const showToast = (message) => {
    if (toastTimer) clearTimeout(toastTimer)
    setToast({ message, visible: true })
    toastTimer = setTimeout(() => setToast({ message: '', visible: false }), 2200)
  }
  return { toast, showToast }
}

export function Loading() {
  return <div className="loading"><div className="spinner" /><span>Loading…</span></div>
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="error-box">
      <div className="error-text">{message || 'Something went wrong.'}</div>
      {onRetry && <button className="btn-primary" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function EmptyState({ Icon, message, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={32} style={{ opacity: 0.3 }} />}
      <div>{message}</div>
      {action}
    </div>
  )
}

// Lock badge + admin unlock button
export function LockBadge({ entry, isAdminUser, onUnlock }) {
  if (!entry?.locked) return null
  return (
    <span className="lock-badge">
      <Lock size={12} /> Locked
      {isAdminUser && onUnlock && (
        <button className="unlock-btn" onClick={onUnlock}><Unlock size={11} /> Unlock</button>
      )}
    </span>
  )
}

// RED roll warning banner
export function RollWarningBanner({ warnings }) {
  if (!warnings || warnings.length === 0) return null
  return (
    <div className="roll-warning">
      <AlertTriangle size={18} />
      <div>
        <div className="roll-warning-title">ROLL COUNT MISMATCH — CHECK FOR MISSING ROLLS</div>
        {warnings.map((w, i) => <div key={i} className="roll-warning-line">{w.message}</div>)}
      </div>
    </div>
  )
}
