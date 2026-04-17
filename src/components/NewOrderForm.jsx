import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../lib/api'
import { today } from '../lib/utils'
import { Field } from './ui'

export default function NewOrderForm({ showToast }) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    buyer_name: '', buyer_po: '', fabric_name: '', composition: '',
    gsm: '', colour: '', width: '', required_kgs: '', required_meters: '',
    order_date: today(), target_date: ''
  })
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }))

  const save = async () => {
    if (!f.buyer_name || !f.fabric_name) { alert('Buyer and Fabric Name are required'); return }
    setSaving(true)
    try {
      const order = await createOrder({
        buyer_name: f.buyer_name,
        buyer_po: f.buyer_po || null,
        fabric_name: f.fabric_name,
        composition: f.composition || null,
        gsm: f.gsm ? Number(f.gsm) : null,
        colour: f.colour || null,
        width: f.width || null,
        required_kgs: f.required_kgs ? Number(f.required_kgs) : null,
        required_meters: f.required_meters ? Number(f.required_meters) : null,
        order_date: f.order_date,
        target_date: f.target_date || null,
      })
      showToast('Order created')
      navigate(`/orders/${order.id}`)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">New Fabric Order</h2>
        <div className="form-grid">
          <Field label="Job Number" value="Auto-generated" readOnly mono />
          <Field label="Order Date" type="date" value={f.order_date} onChange={v => upd('order_date', v)} />
          <Field label="Buyer Name *" value={f.buyer_name} onChange={v => upd('buyer_name', v)} placeholder="e.g. Celio" />
          <Field label="Buyer PO Reference" value={f.buyer_po} onChange={v => upd('buyer_po', v)} mono />
          <Field label="Fabric Name *" value={f.fabric_name} onChange={v => upd('fabric_name', v)} placeholder="e.g. Single Jersey" />
          <Field label="Composition" value={f.composition} onChange={v => upd('composition', v)} placeholder="e.g. 95% Cotton 5% Elastane" />
          <Field label="GSM" value={f.gsm} onChange={v => upd('gsm', v)} type="number" mono />
          <Field label="Colour" value={f.colour} onChange={v => upd('colour', v)} />
          <Field label="Dia / Width" value={f.width} onChange={v => upd('width', v)} placeholder="e.g. 36 inch open" />
          <Field label="Required Qty (Kgs)" value={f.required_kgs} onChange={v => upd('required_kgs', v)} type="number" mono />
          <Field label="Required Qty (Meters)" value={f.required_meters} onChange={v => upd('required_meters', v)} type="number" mono />
          <Field label="Target Inhouse Date" type="date" value={f.target_date} onChange={v => upd('target_date', v)} />
        </div>
        <div className="form-actions">
          <button className="btn-ghost" onClick={() => navigate('/orders')}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
