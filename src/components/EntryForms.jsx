import React, { useState, useEffect } from 'react'
import { upsertYarn, upsertProcess, upsertInhouse } from '../lib/api'
import { today, daysBetween, num } from '../lib/utils'
import { LOSS_LIMIT_PERCENT } from '../lib/constants'
import { Field, SelectField } from './ui'

// ============ YARN ENTRY ============
export function YarnEntryForm({ orderId, existing, onDone }) {
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    supplier_name: '', invoice_no: '', yarn_type: '', lot_no: '',
    yarn_kgs: '', received_date: today(),
  })

  useEffect(() => {
    if (existing) setF({
      supplier_name: existing.supplier_name || '',
      invoice_no: existing.invoice_no || '',
      yarn_type: existing.yarn_type || '',
      lot_no: existing.lot_no || '',
      yarn_kgs: existing.yarn_kgs || '',
      received_date: existing.received_date || today(),
    })
  }, [existing?.id])

  const upd = (k, v) => setF(s => ({ ...s, [k]: v }))

  const save = async () => {
    if (!f.yarn_kgs || !f.received_date) { alert('Yarn Kgs and Received Date required'); return }
    setSaving(true)
    try {
      await upsertYarn({
        ...(existing?.id ? { id: existing.id } : {}),
        order_id: orderId,
        supplier_name: f.supplier_name || null,
        invoice_no: f.invoice_no || null,
        yarn_type: f.yarn_type || null,
        lot_no: f.lot_no || null,
        yarn_kgs: Number(f.yarn_kgs),
        received_date: f.received_date,
      })
      onDone('Yarn entry saved')
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="entry-form">
      <Field label="Supplier Name" value={f.supplier_name} onChange={v => upd('supplier_name', v)} />
      <Field label="Invoice Number" value={f.invoice_no} onChange={v => upd('invoice_no', v)} mono />
      <Field label="Yarn Count / Type" value={f.yarn_type} onChange={v => upd('yarn_type', v)} placeholder="e.g. 30s Combed" />
      <Field label="Lot Number" value={f.lot_no} onChange={v => upd('lot_no', v)} mono />
      <Field label="Yarn Received Kgs *" value={f.yarn_kgs} onChange={v => upd('yarn_kgs', v)} type="number" mono />
      <Field label="Received Date *" type="date" value={f.received_date} onChange={v => upd('received_date', v)} />
      <button className="btn-save-big" onClick={save} disabled={saving}>
        {saving ? 'SAVING…' : 'SAVE YARN ENTRY'}
      </button>
    </div>
  )
}

// ============ PROCESS ENTRY ============
export function ProcessEntryForm({ orderId, stage, existing, suggestedInward, onDone }) {
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    vendor_name: '', inward_date: today(), inward_dc: '', inward_kgs: '',
    outward_date: '', outward_dc: '', outward_kgs: '', rolls: '', avg_roll_weight: '', remarks: ''
  })

  useEffect(() => {
    if (existing) {
      setF({
        vendor_name: existing.vendor_name || '',
        inward_date: existing.inward_date || today(),
        inward_dc: existing.inward_dc || '',
        inward_kgs: existing.inward_kgs || '',
        outward_date: existing.outward_date || '',
        outward_dc: existing.outward_dc || '',
        outward_kgs: existing.outward_kgs || '',
        rolls: existing.rolls || '',
        avg_roll_weight: existing.avg_roll_weight || '',
        remarks: existing.remarks || '',
      })
    } else {
      setF(s => ({ ...s, inward_kgs: suggestedInward || s.inward_kgs }))
    }
  }, [existing?.id, stage, suggestedInward])

  const upd = (k, v) => setF(s => ({ ...s, [k]: v }))

  const loss_kgs = Math.max(0, num(f.inward_kgs) - num(f.outward_kgs))
  const loss_percent = num(f.inward_kgs) > 0 ? (loss_kgs / num(f.inward_kgs)) * 100 : 0
  const days_taken = daysBetween(f.inward_date, f.outward_date)

  const save = async () => {
    if (!f.inward_date || !f.inward_kgs) { alert('Inward date and kgs required'); return }
    setSaving(true)
    try {
      await upsertProcess({
        ...(existing?.id ? { id: existing.id } : {}),
        order_id: orderId,
        process_name: stage,
        vendor_name: f.vendor_name || null,
        inward_date: f.inward_date,
        inward_dc: f.inward_dc || null,
        inward_kgs: Number(f.inward_kgs),
        outward_date: f.outward_date || null,
        outward_dc: f.outward_dc || null,
        outward_kgs: f.outward_kgs ? Number(f.outward_kgs) : null,
        rolls: f.rolls ? Number(f.rolls) : null,
        avg_roll_weight: f.avg_roll_weight ? Number(f.avg_roll_weight) : null,
        remarks: f.remarks || null,
      })
      onDone(`${stage} entry saved`)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="entry-form">
      <Field label="Vendor / Unit Name" value={f.vendor_name} onChange={v => upd('vendor_name', v)} />
      <div className="form-subdivider">INWARD</div>
      <Field label="Inward Date *" type="date" value={f.inward_date} onChange={v => upd('inward_date', v)} />
      <Field label="Inward DC Number" value={f.inward_dc} onChange={v => upd('inward_dc', v)} mono />
      <Field label="Inward Kgs *" value={f.inward_kgs} onChange={v => upd('inward_kgs', v)} type="number" mono />
      <div className="form-subdivider">OUTWARD</div>
      <Field label="Outward Date" type="date" value={f.outward_date} onChange={v => upd('outward_date', v)} />
      <Field label="Outward DC Number" value={f.outward_dc} onChange={v => upd('outward_dc', v)} mono />
      <Field label="Outward Kgs" value={f.outward_kgs} onChange={v => upd('outward_kgs', v)} type="number" mono />
      <Field label="Number of Rolls" value={f.rolls} onChange={v => upd('rolls', v)} type="number" mono />
      <Field label="Avg Roll Weight" value={f.avg_roll_weight} onChange={v => upd('avg_roll_weight', v)} type="number" mono />
      <Field label="Remarks" value={f.remarks} onChange={v => upd('remarks', v)} />
      <div className="calc-box">
        <div className="calc-row"><span>Loss Kgs</span><strong className="mono">{loss_kgs.toFixed(2)}</strong></div>
        <div className="calc-row"><span>Loss %</span>
          <strong className={`mono ${loss_percent > LOSS_LIMIT_PERCENT ? 'loss-high' : ''}`}>{loss_percent.toFixed(2)}%</strong>
        </div>
        <div className="calc-row"><span>Days Taken</span><strong className="mono">{days_taken}d</strong></div>
      </div>
      <button className="btn-save-big" onClick={save} disabled={saving}>
        {saving ? 'SAVING…' : `SAVE ${stage.toUpperCase()} ENTRY`}
      </button>
    </div>
  )
}

// ============ INHOUSE ENTRY ============
export function InhouseEntryForm({ orderId, yarn, existing, onDone }) {
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    inhouse_date: today(), final_kgs: '', rolls: '', avg_roll_weight: '',
    qc_status: 'Pending', shade_status: 'Pending', rack_location: ''
  })

  useEffect(() => {
    if (existing) setF({
      inhouse_date: existing.inhouse_date || today(),
      final_kgs: existing.final_kgs || '',
      rolls: existing.rolls || '',
      avg_roll_weight: existing.avg_roll_weight || '',
      qc_status: existing.qc_status || 'Pending',
      shade_status: existing.shade_status || 'Pending',
      rack_location: existing.rack_location || '',
    })
  }, [existing?.id])

  const upd = (k, v) => setF(s => ({ ...s, [k]: v }))
  const total_days = yarn ? daysBetween(yarn.received_date, f.inhouse_date) : 0

  const save = async () => {
    if (!f.inhouse_date || !f.final_kgs) { alert('Date and Final Kgs required'); return }
    setSaving(true)
    try {
      await upsertInhouse({
        ...(existing?.id ? { id: existing.id } : {}),
        order_id: orderId,
        inhouse_date: f.inhouse_date,
        final_kgs: Number(f.final_kgs),
        rolls: f.rolls ? Number(f.rolls) : null,
        avg_roll_weight: f.avg_roll_weight ? Number(f.avg_roll_weight) : null,
        qc_status: f.qc_status,
        shade_status: f.shade_status,
        rack_location: f.rack_location || null,
        total_days,
      })
      onDone('Inhouse entry saved')
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="entry-form">
      <Field label="Inhouse Date *" type="date" value={f.inhouse_date} onChange={v => upd('inhouse_date', v)} />
      <Field label="Final Received Kgs *" value={f.final_kgs} onChange={v => upd('final_kgs', v)} type="number" mono />
      <Field label="Number of Rolls" value={f.rolls} onChange={v => upd('rolls', v)} type="number" mono />
      <Field label="Avg Roll Weight" value={f.avg_roll_weight} onChange={v => upd('avg_roll_weight', v)} type="number" mono />
      <SelectField label="QC Status" value={f.qc_status} onChange={v => upd('qc_status', v)} options={['Pending', 'Passed', 'Rejected', 'Partial']} />
      <SelectField label="Shade Status" value={f.shade_status} onChange={v => upd('shade_status', v)} options={['Pending', 'Approved', 'Rejected']} />
      <Field label="Rack Location" value={f.rack_location} onChange={v => upd('rack_location', v)} mono />
      <div className="calc-box">
        <div className="calc-row"><span>Total Days (Yarn → Inhouse)</span><strong className="mono">{total_days}d</strong></div>
      </div>
      <button className="btn-save-big" onClick={save} disabled={saving}>
        {saving ? 'SAVING…' : 'CONFIRM INHOUSE'}
      </button>
    </div>
  )
}
