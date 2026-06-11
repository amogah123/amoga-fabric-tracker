import React, { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import {
  upsertProcess, upsertInhouse, fetchBatches,
  addOrderAllocation, deleteOrderAllocation
} from '../lib/api'
import { today, daysBetween, num, lockFields, canEdit } from '../lib/utils'
import { LOSS_LIMIT_PERCENT } from '../lib/constants'
import { Field, SelectField } from './ui'

// ---------- GREY FABRIC ALLOCATION ----------
export function AllocationForm({ orderId, allocations, userEmail, onDone }) {
  const [batches, setBatches] = useState([])
  const [pull, setPull] = useState({ batch_id: '', allocated_kgs: '', rolls: '' })

  useEffect(() => { fetchBatches().then(setBatches).catch(() => {}) }, [])

  const addPull = async () => {
    if (!pull.batch_id || num(pull.allocated_kgs) <= 0) { alert('Select a batch and enter kgs'); return }
    const b = batches.find(x => x.id === pull.batch_id)
    if (b && num(pull.allocated_kgs) > num(b.balance_kgs)) {
      if (!confirm(`Only ${num(b.balance_kgs).toFixed(1)} kgs grey stock left in ${b.batch_no}. Allocate anyway?`)) return
    }
    try {
      await addOrderAllocation({
        order_id: orderId, batch_id: pull.batch_id,
        allocated_kgs: Number(pull.allocated_kgs),
        rolls: pull.rolls ? Number(pull.rolls) : null,
        ...lockFields(userEmail),
      })
      setPull({ batch_id: '', allocated_kgs: '', rolls: '' })
      onDone('Grey fabric allocated')
    } catch (e) { alert('Error: ' + e.message) }
  }

  const remove = async (a) => {
    if (!canEdit(userEmail, a)) { alert('This allocation is locked. Ask Admin to unlock.'); return }
    if (!confirm('Remove this allocation?')) return
    try { await deleteOrderAllocation(a.id); onDone('Allocation removed') }
    catch (e) { alert('Error: ' + e.message) }
  }

  return (
    <div>
      {(allocations || []).map(a => (
        <div key={a.id} className="alloc-row">
          <span className="mono strong">{a.knitting_batches?.batch_no} {a.locked && '🔒'}</span>
          <span>{a.knitting_batches?.fabric_structure} {a.knitting_batches?.dia || ''}</span>
          <span className="mono">{num(a.allocated_kgs).toFixed(1)} kgs{a.rolls ? ` · ${a.rolls} rolls` : ''}</span>
          <button className="btn-icon" onClick={() => remove(a)}><Trash2 size={14} /></button>
        </div>
      ))}
      <div className="line-row" style={{ marginTop: 10 }}>
        <label className="field">
          <span className="field-label">From Knitting Batch</span>
          <select className="field-input" value={pull.batch_id} onChange={e => setPull(s => ({ ...s, batch_id: e.target.value }))}>
            <option value="">— Select batch —</option>
            {batches.filter(b => num(b.output_kgs) > 0).map(b => (
              <option key={b.id} value={b.id}>
                {b.batch_no} · {b.fabric_structure} {b.dia || ''} · grey bal {num(b.balance_kgs).toFixed(0)} kg
              </option>
            ))}
          </select>
        </label>
        <Field label="Kgs *" type="number" value={pull.allocated_kgs} onChange={v => setPull(s => ({ ...s, allocated_kgs: v }))} mono />
        <Field label="Rolls" type="number" value={pull.rolls} onChange={v => setPull(s => ({ ...s, rolls: v }))} mono />
        <button className="btn-ghost" style={{ alignSelf: 'end' }} onClick={addPull}>+ Allocate</button>
      </div>
    </div>
  )
}

// ---------- PROCESS ENTRY (Dyeing / D&S / Stentering / Compacting / Finishing) ----------
export function ProcessEntryForm({ orderId, stage, existing, suggestedInward, prevRolls, prevStageName, userEmail, onDone }) {
  const editable = canEdit(userEmail, existing)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    vendor_name: '', inward_date: today(), inward_dc: '', inward_kgs: '',
    outward_date: '', outward_dc: '', outward_kgs: '', rolls: '', avg_roll_weight: '', remarks: ''
  })

  useEffect(() => {
    if (existing) {
      setF({
        vendor_name: existing.vendor_name || '', inward_date: existing.inward_date || today(),
        inward_dc: existing.inward_dc || '', inward_kgs: existing.inward_kgs || '',
        outward_date: existing.outward_date || '', outward_dc: existing.outward_dc || '',
        outward_kgs: existing.outward_kgs || '', rolls: existing.rolls || '',
        avg_roll_weight: existing.avg_roll_weight || '', remarks: existing.remarks || '',
      })
    } else {
      setF(s => ({ ...s, inward_kgs: suggestedInward || s.inward_kgs }))
    }
  }, [existing?.id, stage, suggestedInward])

  const upd = (k, v) => { if (editable) setF(s => ({ ...s, [k]: v })) }

  const loss_kgs = Math.max(0, num(f.inward_kgs) - num(f.outward_kgs))
  const loss_percent = num(f.inward_kgs) > 0 && num(f.outward_kgs) > 0 ? (loss_kgs / num(f.inward_kgs)) * 100 : 0
  const days_taken = daysBetween(f.inward_date, f.outward_date)
  const rollsMissing = (prevRolls && f.rolls && num(f.rolls) < num(prevRolls)) ? num(prevRolls) - num(f.rolls) : 0

  const save = async () => {
    if (!f.inward_date || !f.inward_kgs) { alert('Inward date and kgs required'); return }
    setSaving(true)
    try {
      await upsertProcess({
        ...(existing?.id ? { id: existing.id } : {}),
        order_id: orderId, process_name: stage,
        vendor_name: f.vendor_name || null,
        inward_date: f.inward_date, inward_dc: f.inward_dc || null,
        inward_kgs: Number(f.inward_kgs),
        outward_date: f.outward_date || null, outward_dc: f.outward_dc || null,
        outward_kgs: f.outward_kgs ? Number(f.outward_kgs) : null,
        rolls: f.rolls ? Number(f.rolls) : null,
        avg_roll_weight: f.avg_roll_weight ? Number(f.avg_roll_weight) : null,
        remarks: f.remarks || null,
        ...lockFields(userEmail),
      })
      onDone(`${stage} saved`)
    } catch (e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  return (
    <div className="entry-form">
      {!editable && (
        <div className="locked-banner" style={{ gridColumn: '1 / -1' }}>
          🔒 This entry is locked. Ask Admin to unlock for editing.
        </div>
      )}
      <Field label="Vendor / Unit Name" value={f.vendor_name} onChange={v => upd('vendor_name', v)} readOnly={!editable} />
      <div className="form-subdivider">INWARD (fabric sent to unit)</div>
      <Field label="Inward Date *" type="date" value={f.inward_date} onChange={v => upd('inward_date', v)} readOnly={!editable} />
      <Field label="Inward DC Number" value={f.inward_dc} onChange={v => upd('inward_dc', v)} mono readOnly={!editable} />
      <Field label="Inward Kgs *" value={f.inward_kgs} onChange={v => upd('inward_kgs', v)} type="number" mono readOnly={!editable} />
      <div className="form-subdivider">OUTWARD (fabric received back)</div>
      <Field label="Outward Date" type="date" value={f.outward_date} onChange={v => upd('outward_date', v)} readOnly={!editable} />
      <Field label="Outward DC Number" value={f.outward_dc} onChange={v => upd('outward_dc', v)} mono readOnly={!editable} />
      <Field label="Outward Kgs" value={f.outward_kgs} onChange={v => upd('outward_kgs', v)} type="number" mono readOnly={!editable} />
      <Field label="Number of Rolls" value={f.rolls} onChange={v => upd('rolls', v)} type="number" mono readOnly={!editable} />
      <Field label="Avg Roll Weight" value={f.avg_roll_weight} onChange={v => upd('avg_roll_weight', v)} type="number" mono readOnly={!editable} />
      <Field label="Remarks" value={f.remarks} onChange={v => upd('remarks', v)} readOnly={!editable} />
      {rollsMissing > 0 && (
        <div className="roll-warning" style={{ gridColumn: '1 / -1' }}>
          <div className="roll-warning-title">⚠ {rollsMissing} ROLL{rollsMissing > 1 ? 'S' : ''} MISSING</div>
          <div className="roll-warning-line">{prevStageName || 'Previous stage'} had {num(prevRolls)} rolls, this entry has {num(f.rolls)}. Check for theft or missing rolls. You can still save, but please add a remark explaining the shortage.</div>
        </div>
      )}
      <div className="calc-box">
        <div className="calc-row"><span>Loss Kgs</span><strong className="mono">{loss_kgs.toFixed(2)}</strong></div>
        <div className="calc-row"><span>Loss %</span>
          <strong className={`mono ${loss_percent > LOSS_LIMIT_PERCENT ? 'loss-high' : ''}`}>{loss_percent.toFixed(2)}%</strong>
        </div>
        <div className="calc-row"><span>Days Taken</span><strong className="mono">{days_taken}d</strong></div>
      </div>
      {editable && (
        <button className="btn-save-big" onClick={save} disabled={saving}>
          {saving ? 'SAVING…' : `SAVE ${stage.toUpperCase()}`}
        </button>
      )}
    </div>
  )
}

// ---------- INHOUSE — FINAL CONFIRMATION ----------
export function InhouseConfirmForm({ orderId, order, allocations, processes, existing, userEmail, onDone }) {
  const editable = canEdit(userEmail, existing)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    inhouse_date: today(), final_kgs: '', rolls: '', avg_roll_weight: '',
    qc_status: 'Pending', shade_status: 'Pending', rack_location: ''
  })

  useEffect(() => {
    if (existing) setF({
      inhouse_date: existing.inhouse_date || today(), final_kgs: existing.final_kgs || '',
      rolls: existing.rolls || '', avg_roll_weight: existing.avg_roll_weight || '',
      qc_status: existing.qc_status || 'Pending', shade_status: existing.shade_status || 'Pending',
      rack_location: existing.rack_location || '',
    })
  }, [existing?.id])

  const upd = (k, v) => { if (editable) setF(s => ({ ...s, [k]: v })) }

  const greyKgs = (allocations || []).reduce((s, a) => s + num(a.allocated_kgs), 0)
  // Last completed process outward = what we EXPECT to receive
  const lastOut = [...(processes || [])].reverse().find(p => num(p.outward_kgs) > 0)
  const expectedKgs = lastOut ? num(lastOut.outward_kgs) : greyKgs
  const totalLossP = greyKgs > 0 && num(f.final_kgs) > 0 ? ((greyKgs - num(f.final_kgs)) / greyKgs) * 100 : 0
  const total_days = daysBetween(order?.order_date, f.inhouse_date)
  const shortfall = num(f.final_kgs) > 0 ? expectedKgs - num(f.final_kgs) : 0

  const save = async () => {
    if (!f.inhouse_date || !f.final_kgs) { alert('Date and Final Kgs required'); return }
    setSaving(true)
    try {
      await upsertInhouse({
        ...(existing?.id ? { id: existing.id } : {}),
        order_id: orderId, inhouse_date: f.inhouse_date,
        final_kgs: Number(f.final_kgs),
        rolls: f.rolls ? Number(f.rolls) : null,
        avg_roll_weight: f.avg_roll_weight ? Number(f.avg_roll_weight) : null,
        qc_status: f.qc_status, shade_status: f.shade_status,
        rack_location: f.rack_location || null, total_days,
        ...lockFields(userEmail),
      })
      onDone('Order inhoused — completed ✓')
    } catch (e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  return (
    <div>
      {!editable && <div className="locked-banner">🔒 Inhouse is locked. Ask Admin to unlock for editing.</div>}

      <div className="confirm-summary">
        <div className="confirm-title">CHECK BEFORE CONFIRMING</div>
        <div className="calc-row"><span>Grey fabric allocated</span><strong className="mono">{greyKgs.toFixed(1)} kgs</strong></div>
        {(processes || []).filter(p => num(p.outward_kgs) > 0).map(p => (
          <div className="calc-row" key={p.id}><span>{p.process_name} returned</span><strong className="mono">{num(p.outward_kgs).toFixed(1)} kgs</strong></div>
        ))}
        <div className="calc-row"><span>Expected to receive</span><strong className="mono">{expectedKgs.toFixed(1)} kgs</strong></div>
      </div>

      <div className="entry-form" style={{ marginTop: 14 }}>
        <Field label="Inhouse Date *" type="date" value={f.inhouse_date} onChange={v => upd('inhouse_date', v)} readOnly={!editable} />
        <Field label="Final Received Kgs *" value={f.final_kgs} onChange={v => upd('final_kgs', v)} type="number" mono readOnly={!editable} />
        <Field label="Number of Rolls" value={f.rolls} onChange={v => upd('rolls', v)} type="number" mono readOnly={!editable} />
        <Field label="Avg Roll Weight" value={f.avg_roll_weight} onChange={v => upd('avg_roll_weight', v)} type="number" mono readOnly={!editable} />
        <SelectField label="QC Status" value={f.qc_status} onChange={v => upd('qc_status', v)} disabled={!editable} options={['Pending', 'Passed', 'Rejected', 'Partial']} />
        <SelectField label="Shade Status" value={f.shade_status} onChange={v => upd('shade_status', v)} disabled={!editable} options={['Pending', 'Approved', 'Rejected']} />
        <Field label="Rack Location" value={f.rack_location} onChange={v => upd('rack_location', v)} mono readOnly={!editable} />
        <div className="calc-box">
          {shortfall > 0.01 && (
            <div className="calc-row"><span style={{ color: 'var(--red)' }}>Short received</span>
              <strong className="mono loss-high">-{shortfall.toFixed(1)} kgs</strong></div>
          )}
          <div className="calc-row"><span>Total Loss (grey → inhouse)</span>
            <strong className={`mono ${totalLossP > LOSS_LIMIT_PERCENT ? 'loss-high' : ''}`}>{totalLossP.toFixed(2)}%</strong>
          </div>
          <div className="calc-row"><span>Total Days (order → inhouse)</span><strong className="mono">{total_days}d</strong></div>
        </div>
        {editable && (
          <button className="btn-save-big" onClick={save} disabled={saving}>
            {saving ? 'SAVING…' : existing ? 'UPDATE INHOUSE' : 'CONFIRM INHOUSE — CLOSE ORDER'}
          </button>
        )}
      </div>
    </div>
  )
}
