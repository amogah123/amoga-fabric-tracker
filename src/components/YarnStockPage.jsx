import React, { useState, useEffect } from 'react'
import { PlusCircle, X, Layers, Trash2 } from 'lucide-react'
import { fetchYarnStock, createYarnStock } from '../lib/api'
import { today, fmtDate, num, lockFields } from '../lib/utils'
import { Field, Loading, ErrorBox, EmptyState } from './ui'

export default function YarnStockPage({ showToast, userEmail }) {
  const [stock, setStock] = useState(null)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = () => { setError(null); fetchYarnStock().then(setStock).catch(e => setError(e.message)) }
  useEffect(load, [])

  if (error) return <div className="page"><ErrorBox message={error} onRetry={load} /></div>
  if (!stock) return <div className="page"><Loading /></div>

  const totalBalance = stock.reduce((s, r) => s + num(r.balance_kgs), 0)

  return (
    <div className="page">
      <div className="page-head">
        <div className="search-row">
          <div className="stat-inline">
            <span className="stat-inline-label">TOTAL YARN IN STOCK</span>
            <span className="stat-inline-val mono">{totalBalance.toFixed(1)} kgs</span>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <PlusCircle size={16} /> New Yarn Receipt
          </button>
        </div>
      </div>

      {showForm && (
        <YarnReceiptForm userEmail={userEmail}
          onDone={(msg) => { setShowForm(false); showToast(msg); load() }}
          onCancel={() => setShowForm(false)} />
      )}

      {stock.length === 0 ? (
        <EmptyState Icon={Layers} message="No yarn received yet. Add your first yarn invoice." />
      ) : (
        <div className="table-wrap panel">
          <table className="table">
            <thead><tr>
              <th>Invoice</th><th>Date</th><th>Supplier</th><th>Count</th><th>Lot</th>
              <th>Received</th><th>Used</th><th>Balance</th>
            </tr></thead>
            <tbody>
              {stock.map(r => (
                <tr key={r.id}>
                  <td className="mono strong">{r.invoice_no}</td>
                  <td>{fmtDate(r.invoice_date)}</td>
                  <td>{r.supplier_name}</td>
                  <td>{r.yarn_count}</td>
                  <td className="mono">{r.lot_no || '—'}</td>
                  <td className="mono">{num(r.total_kgs).toFixed(1)}</td>
                  <td className="mono">{num(r.used_kgs).toFixed(1)}</td>
                  <td className={`mono strong ${num(r.balance_kgs) <= 0 ? 'balance-zero' : 'balance-pos'}`}>
                    {num(r.balance_kgs).toFixed(1)} kgs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Multi-line invoice form: one invoice, multiple yarn counts
function YarnReceiptForm({ onDone, onCancel, userEmail }) {
  const [saving, setSaving] = useState(false)
  const [head, setHead] = useState({ supplier_name: '', invoice_no: '', invoice_date: today() })
  const [lines, setLines] = useState([{ yarn_count: '', lot_no: '', total_kgs: '' }])

  const updHead = (k, v) => setHead(s => ({ ...s, [k]: v }))
  const updLine = (i, k, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  const addLine = () => setLines(ls => [...ls, { yarn_count: '', lot_no: '', total_kgs: '' }])
  const removeLine = (i) => setLines(ls => ls.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!head.supplier_name || !head.invoice_no) { alert('Supplier and Invoice No required'); return }
    const valid = lines.filter(l => l.yarn_count && num(l.total_kgs) > 0)
    if (valid.length === 0) { alert('Add at least one yarn count with kgs'); return }
    setSaving(true)
    try {
      const rows = valid.map(l => ({
        supplier_name: head.supplier_name,
        invoice_no: head.invoice_no,
        invoice_date: head.invoice_date,
        yarn_count: l.yarn_count,
        lot_no: l.lot_no || null,
        total_kgs: Number(l.total_kgs),
        ...lockFields(userEmail),
      }))
      await createYarnStock(rows)
      onDone('Yarn receipt saved')
    } catch (e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  return (
    <div className="inline-form-card">
      <div className="inline-form-head">
        <div>
          <div className="inline-form-title">New Yarn Receipt</div>
          <div className="inline-form-sub">One invoice can have multiple yarn counts</div>
        </div>
        <button className="btn-icon" onClick={onCancel}><X size={18} /></button>
      </div>
      <div style={{ padding: 20 }}>
        <div className="entry-form" style={{ marginBottom: 8 }}>
          <Field label="Supplier (Spinning Mill) *" value={head.supplier_name} onChange={v => updHead('supplier_name', v)} placeholder="e.g. SSM Spinning" />
          <Field label="Invoice Number *" value={head.invoice_no} onChange={v => updHead('invoice_no', v)} mono />
          <Field label="Invoice Date *" type="date" value={head.invoice_date} onChange={v => updHead('invoice_date', v)} />
        </div>
        <div className="form-subdivider" style={{ marginBottom: 10 }}>YARN COUNTS ON THIS INVOICE</div>
        {lines.map((l, i) => (
          <div key={i} className="line-row">
            <Field label="Yarn Count / Type *" value={l.yarn_count} onChange={v => updLine(i, 'yarn_count', v)} placeholder="e.g. 30s Combed" />
            <Field label="Lot No" value={l.lot_no} onChange={v => updLine(i, 'lot_no', v)} mono />
            <Field label="Kgs *" type="number" value={l.total_kgs} onChange={v => updLine(i, 'total_kgs', v)} mono />
            {lines.length > 1 && (
              <button className="btn-icon line-del" onClick={() => removeLine(i)}><Trash2 size={16} /></button>
            )}
          </div>
        ))}
        <button className="btn-ghost" onClick={addLine} style={{ marginTop: 8 }}>+ Add another count</button>
        <button className="btn-save-big" style={{ display: 'block', width: '100%', marginTop: 16 }} onClick={save} disabled={saving}>
          {saving ? 'SAVING…' : 'SAVE YARN RECEIPT'}
        </button>
      </div>
    </div>
  )
}
