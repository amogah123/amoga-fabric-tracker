import React, { useState, useEffect } from 'react'

// ============ STATUS PILL ============
export function StatusPill({ status }) {
  return (
    <span className={`pill pill-${status.color}`}>
      <span className="pill-dot" />{status.label}
    </span>
  )
}

// ============ STAT TILE ============
export function Tile({ label, value, tone, Icon }) {
  return (
    <div className={`tile tile-${tone}`}>
      <div className="tile-icon"><Icon size={18} /></div>
      <div className="tile-val">{value}</div>
      <div className="tile-label">{label}</div>
    </div>
  )
}

// ============ FORM FIELD ============
export function Field({ label, value, onChange, type = 'text', readOnly, mono, placeholder }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange && onChange(e.target.value)}
        className={`field-input ${mono ? 'mono' : ''} ${readOnly ? 'readonly' : ''}`}
      />
    </label>
  )
}

// ============ SELECT FIELD ============
export function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="field-input" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

// ============ INFO CARD ============
export function InfoCard({ title, children, action }) {
  return (
    <div className="info-card">
      <div className="info-title">
        <span>{title}</span>
        {action}
      </div>
      <div className="info-body">{children}</div>
    </div>
  )
}

// ============ KEY-VALUE ROW ============
export function KV({ k, v }) {
  return (
    <div className="kv">
      <span className="kv-k">{k}</span>
      <span className="kv-v">{v || '—'}</span>
    </div>
  )
}

// ============ TOAST ============
let toastTimer = null

export function Toast({ message, visible }) {
  if (!visible) return null
  return (
    <div className="toast">
      <span className="toast-icon">✓</span> {message}
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState({ message: '', visible: false })

  const showToast = (message) => {
    if (toastTimer) clearTimeout(toastTimer)
    setToast({ message, visible: true })
    toastTimer = setTimeout(() => setToast({ message: '', visible: false }), 2200)
  }

  return { toast, showToast }
}

// ============ LOADING SPINNER ============
export function Loading() {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>Loading…</span>
    </div>
  )
}

// ============ ERROR BOX ============
export function ErrorBox({ message, onRetry }) {
  return (
    <div className="error-box">
      <div className="error-text">{message || 'Something went wrong.'}</div>
      {onRetry && <button className="btn-primary" onClick={onRetry}>Retry</button>}
    </div>
  )
}

// ============ EMPTY STATE ============
export function EmptyState({ Icon, message, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={32} style={{ opacity: 0.3 }} />}
      <div>{message}</div>
      {action}
    </div>
  )
}
