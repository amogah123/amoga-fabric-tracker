import React, { useState, useEffect } from 'react'
import { PlusCircle, X, Scissors, Trash2 } from 'lucide-react'
import {
  fetchBatches, fetchYarnStock, nextBatchNo, createBatch, updateBatch,
  fetchBatchYarn, addBatchYarn, deleteBatchYarn
} from '../lib/api'
import { today, fmtDate, num, lockFields, isAdmin, canEdit } from '../lib/utils'
import { Field, Loading, ErrorBox, EmptyState, LockBadge } from './ui'

export default function KnittingPage({ showToast, userEmail }) {
  const [batches, setBatches] = useState(null)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editBatch, setEditBatch] = useState(null)

  const load = () => { setError(null); fetchBatches().then(setBatches).catch(e => setError(e.message)) }
  useEffect(load, [])

  if (error) return <div className="page"><ErrorBox message={error} onRetry={load} /></div>
  if (!batches) return <div className="page"><Loading /></div>

  const totalGrey = batches.reduce((s, b) => s + Math.max(0, num(b.balance_kgs)), 0)

  return (
    <div className="page">
      <div className="page-head">
        <div className="search-row">
          <div className="stat-inline">
            <span className="stat-inline-label">GREY FABRIC IN STOCK</span>
            <span className="stat-inline-val mono">{totalGrey.toFixed(1)} kgs</span>
          </div>
          <button className="btn-primary" onClick={() => { setEditBatch(null); setShowForm(true) }}>
            <PlusCircle size={16} /> New Knitting Batch
          </button>
        </div>
      </div>

      {showForm && (
        <BatchForm batch={editBatch} userEmail={userEmail}
          onDone={(msg) => { setShowForm(false); setEditBatch(null); showToast(msg); load() }}
          onCancel={() => { setShowForm(false); setEditBatch(null) }} />
      )}

      {batches.length === 0 ? (
        <EmptyState Icon={Scissors} message="No knitting batches yet." />
      ) : (
        <div className="table-wrap panel">
          <table className="table">
            <thead><tr>
              <th>Batch</th><th>Structure</th><th>Dia</th><th>GSM</th><th>Vendor</th>
              <th>Yarn In</th><th>Knitted</th><th>Loss %</th><th>Given to Orders</th><th>Grey Stock</th><th></th>
            </tr></thead>
            <tbody>
              {batches.map(b => {
                const lossP = num(b.yarn_in_kgs) > 0 && num(b.output_kgs) > 0
                  ? ((num(b.yarn_in_kgs) - num(b.output_kgs)) / num(b.yarn_in_kgs)) * 100 : 0
                return (
                  <tr key={b.id} className="row-click" onClick={() => { setEditBatch(b); setShowForm(true); window.scrollTo(0, 0) }}>
                    <td className="mono strong">{b.batch_no} {b.locked && '🔒'}</td>
                    <td>{b.fabric_structure}</td>
                    <td className="mono">{b.dia || '—'}</td>
                    <td className="mono">{b.gsm || '—'}</td>
                    <td>{b.vendor_name || '—'}</td>
                    <td className="mono">{num(b.yarn_in_kgs).toFixed(1)}</td>
                    <td className="mono">{b.output_kgs ? num(b.output_kgs).toFixed(1) : '—'}</td>
                    <td className={`mono ${lossP > 7 ? 'loss-high' : ''}`}>{b.output_kgs ? lossP.toFixed(1) + '%' : '—'}</td>
                    <td className="mono">{num(b.allocated_kgs).toFixed(1)}</td>
                    <td className={`mono strong ${num(b.balance_kgs) <= 0 ? 'balance-zero' : 'balance-pos'}`}>
                      {b.output_kgs ? num(b.balance_kgs).toFixed(1) : '—'}
                    </td>
                    <td><span className="row-action">Open</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BatchForm({ batch, onDone, onCancel, userEmail }) {
  const isNew = !batch
  const editable = isNew || canEdit(userEmail, batch)
  const [saving, setSaving] = useState(false)
  const [yarnStock, setYarnStock] = useState([])
  const [batchYarn, setBatchYarn] = useState([])
  const [f, setF] = useState({
    batch_no: '', fabric_structure: '', dia: '', gsm: '', vendor_name: '',
    start_date: today(), end_date: '', output_kgs: '', rolls: '', remarks: ''
  })
  // New yarn pull line
  const [pull, setPull] = useState({ yarn_stock_id: '', allocated_kgs: '' })

  useEffect(() => {
    fetchYarnStock().then(setYarnStock).catch(() => {})
    if (batch) {
      setF({
        batch_no: batch.batch_no, fabric_structure: batch.fabric_structure || '',
        dia: batch.dia || '', gsm: batch.gsm || '', vendor_name: batch.vendor_name || '',
        start_date: batch.start_date || today(), end_date: batch.end_date || '',
        output_kgs: batch.output_kgs || '', rolls: batch.rolls || '', remarks: batch.remarks || ''
      })
      fetchBatchYarn(batch.id).then(setBatchYarn).catch(() => {})
    } else {
      nextBatchNo().then(n => setF(s => ({ ...s, batch_no: n }))).catch(() => {})
    }
  }, [batch?.id])

  const upd = (k, v) => setF(s => ({ ...s, [k]: v }))
  const yarnInTotal = batchYarn.reduce((s, y) => s + num(y.allocated_kgs), 0)
  const lossP = yarnInTotal > 0 && num(f.output_kgs) > 0 ? ((yarnInTotal - num(f.output_kgs)) / yarnInTotal) * 100 : 0

  const save = async () => {
    if (!f.fabric_structure) { alert('Fabric structure required'); return }
    setSaving(true)
    try {
      const data = {
        batch_no: f.batch_no,
        fabric_structure: f.fabric_structure,
        dia: f.dia || null, gsm: f.gsm ? Number(f.gsm) : null,
        vendor_name: f.vendor_name || null,
        start_date: f.start_date || null, end_date: f.end_date || null,
        output_kgs: f.output_kgs ? Number(f.output_kgs) : null,
        rolls: f.rolls ? Number(f.rolls) : null,
        remarks: f.remarks || null,
        ...lockFields(userEmail),
      }
      if (isNew) await createBatch(data)
      else await updateBatch(batch.id, data)
      onDone(isNew ? 'Batch created' : 'Batch updated')
    } catch (e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  const addPull = async () => {
    if (!batch) { alert('Save the batch first, then add yarn'); return }
    if (!pull.yarn_stock_id || num(pull.allocated_kgs) <= 0) { alert('Select yarn and enter kgs'); return }
    const ys = yarnStock.find(y => y.id === pull.yarn_stock_id)
    if (ys && num(pull.allocated_kgs) > num(ys.balance_kgs)) {
      if (!confirm(`Only ${num(ys.balance_kgs).toFixed(1)} kgs left on this invoice line. Allocate anyway?`)) return
    }
    try {
      await addBatchYarn({ batch_id: batch.id, yarn_stock_id: pull.yarn_stock_id, allocated_kgs: Number(pull.allocated_kgs) })
      setPull({ yarn_stock_id: '', allocated_kgs: '' })
      fetchBatchYarn(batch.id).then(setBatchYarn)
      fetchYarnStock().then(setYarnStock)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const removePull = async (id) => {
    if (!confirm('Remove this yarn allocation?')) return
    try {
      await deleteBatchYarn(id)
      fetchBatchYarn(batch.id).then(setBatchYarn)
      fetchYarnStock().then(setYarnStock)
    } catch (e) { alert('Error: ' + e.message) }
  }

  return (
    <div className="inline-form-card">
      <div className="inline-form-head">
        <div>
          <div className="inline-form-title">{isNew ? 'New Knitting Batch' : `Batch ${f.batch_no}`}</div>
          <div className="inline-form-sub">Yarn goes in · grey fabric comes out</div>
        </div>
        <button className="btn-icon" onClick={onCancel}><X size={18} /></button>
      </div>
      <div style={{ padding: 20 }}>
        {!editable && (
          <div className="locked-banner">🔒 This batch is locked. Ask Admin to unlock for editing.</div>
        )}
        <div className="entry-form">
          <Field label="Batch No" value={f.batch_no} readOnly mono />
          <Field label="Fabric Structure *" value={f.fabric_structure} onChange={v => editable && upd('fabric_structure', v)} placeholder="e.g. Single Jersey" readOnly={!editable} />
          <Field label="Dia" value={f.dia} onChange={v => editable && upd('dia', v)} placeholder='e.g. 28"' readOnly={!editable} />
          <Field label="GSM" type="number" value={f.gsm} onChange={v => editable && upd('gsm', v)} mono readOnly={!editable} />
          <Field label="Knitting Vendor / Unit" value={f.vendor_name} onChange={v => editable && upd('vendor_name', v)} readOnly={!editable} />
          <Field label="Start Date" type="date" value={f.start_date} onChange={v => editable && upd('start_date', v)} readOnly={!editable} />
          <Field label="End Date" type="date" value={f.end_date} onChange={v => editable && upd('end_date', v)} readOnly={!editable} />
          <Field label="Knitted Output Kgs" type="number" value={f.output_kgs} onChange={v => editable && upd('output_kgs', v)} mono readOnly={!editable} />
          <Field label="Number of Rolls" type="number" value={f.rolls} onChange={v => editable && upd('rolls', v)} mono readOnly={!editable} />
          <Field label="Remarks" value={f.remarks} onChange={v => editable && upd('remarks', v)} readOnly={!editable} />
        </div>

        {!isNew && (
          <>
            <div className="form-subdivider" style={{ margin: '18px 0 10px' }}>YARN USED IN THIS BATCH</div>
            {batchYarn.length === 0 && <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>No yarn pulled yet.</div>}
            {batchYarn.map(y => (
              <div key={y.id} className="alloc-row">
                <span className="mono">{y.yarn_stock?.invoice_no}</span>
                <span>{y.yarn_stock?.yarn_count} ({y.yarn_stock?.supplier_name})</span>
                <span className="mono strong">{num(y.allocated_kgs).toFixed(1)} kgs</span>
                {editable && <button className="btn-icon" onClick={() => removePull(y.id)}><Trash2 size={14} /></button>}
              </div>
            ))}
            {editable && (
              <div className="line-row" style={{ marginTop: 10 }}>
                <label className="field">
                  <span className="field-label">Pull Yarn From</span>
                  <select className="field-input" value={pull.yarn_stock_id} onChange={e => setPull(s => ({ ...s, yarn_stock_id: e.target.value }))}>
                    <option value="">— Select invoice line —</option>
                    {yarnStock.filter(y => num(y.balance_kgs) > 0 || y.id === pull.yarn_stock_id).map(y => (
                      <option key={y.id} value={y.id}>
                        {y.invoice_no} · {y.yarn_count} · bal {num(y.balance_kgs).toFixed(0)} kg
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Kgs" type="number" value={pull.allocated_kgs} onChange={v => setPull(s => ({ ...s, allocated_kgs: v }))} mono />
                <button className="btn-ghost" style={{ alignSelf: 'end' }} onClick={addPull}>+ Add</button>
              </div>
            )}
            <div className="calc-box" style={{ marginTop: 14 }}>
              <div className="calc-row"><span>Total Yarn In</span><strong className="mono">{yarnInTotal.toFixed(1)} kgs</strong></div>
              <div className="calc-row"><span>Knitted Output</span><strong className="mono">{num(f.output_kgs).toFixed(1)} kgs</strong></div>
              <div className="calc-row"><span>Knitting Loss</span>
                <strong className={`mono ${lossP > 7 ? 'loss-high' : ''}`}>{lossP.toFixed(2)}%</strong>
              </div>
            </div>
          </>
        )}

        {editable && (
          <button className="btn-save-big" style={{ display: 'block', width: '100%', marginTop: 16 }} onClick={save} disabled={saving}>
            {saving ? 'SAVING…' : isNew ? 'CREATE BATCH (then add yarn)' : 'SAVE BATCH'}
          </button>
        )}
      </div>
    </div>
  )
}
