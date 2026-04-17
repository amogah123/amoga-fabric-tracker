import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, Printer, X } from 'lucide-react'
import { fetchOrderFull } from '../lib/api'
import { getOrderStatus, getNextStage, fmtDate, num } from '../lib/utils'
import { PROCESS_STAGES, LOSS_LIMIT_PERCENT } from '../lib/constants'
import { StatusPill, InfoCard, KV, Loading, ErrorBox } from './ui'
import { YarnEntryForm, ProcessEntryForm, InhouseEntryForm } from './EntryForms'

export default function OrderDetail({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [activeStage, setActiveStage] = useState(null)

  const load = () => {
    setError(null)
    fetchOrderFull(id).then(setData).catch(e => setError(e.message))
  }
  useEffect(load, [id])

  if (error) return <div className="page"><ErrorBox message={error} onRetry={load} /></div>
  if (!data) return <div className="page"><Loading /></div>

  const { order, yarn, processes, inhouse } = data
  const status = getOrderStatus(order, yarn, processes, inhouse)
  const nextStage = getNextStage(yarn, processes, inhouse)

  const closeForm = () => setActiveStage(null)
  const handleDone = (msg) => {
    showToast(msg)
    setActiveStage(null)
    load() // refresh data
  }

  const existingProc = activeStage && PROCESS_STAGES.includes(activeStage)
    ? processes.find(p => p.process_name === activeStage) : null

  const suggestedInwardFor = (stage) => {
    if (stage === 'Knitting') return yarn?.yarn_kgs
    const idx = PROCESS_STAGES.indexOf(stage)
    if (idx <= 0) return null
    const prev = processes.find(p => p.process_name === PROCESS_STAGES[idx - 1])
    return prev?.outward_kgs
  }

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> Back to orders</button>

      <div className="detail-head">
        <div>
          <div className="detail-job">{order.job_number}</div>
          <div className="detail-buyer">{order.buyer_name} · {order.fabric_name} · {order.colour}</div>
        </div>
        <div className="detail-head-right">
          <StatusPill status={status} />
          {nextStage && (
            <button className="btn-primary" onClick={() => setActiveStage(nextStage)}>
              <PlusCircle size={16} /> Add {nextStage}
            </button>
          )}
          {inhouse && (
            <button className="btn-primary" onClick={() => navigate(`/orders/${id}/report`)}>
              <Printer size={16} /> Closing Report
            </button>
          )}
        </div>
      </div>

      {/* Inline entry form */}
      {activeStage && (
        <div className="inline-form-card">
          <div className="inline-form-head">
            <div>
              <div className="inline-form-title">{activeStage}</div>
              <div className="inline-form-sub">{order.job_number} · {order.buyer_name}</div>
            </div>
            <button className="btn-icon" onClick={closeForm}><X size={18} /></button>
          </div>
          <div style={{ padding: 20 }}>
            {activeStage === 'Yarn Received' && (
              <YarnEntryForm orderId={order.id} existing={yarn} onDone={handleDone} />
            )}
            {PROCESS_STAGES.includes(activeStage) && (
              <ProcessEntryForm orderId={order.id} stage={activeStage} existing={existingProc}
                suggestedInward={suggestedInwardFor(activeStage)} onDone={handleDone} />
            )}
            {activeStage === 'Fabric Inhouse' && (
              <InhouseEntryForm orderId={order.id} yarn={yarn} existing={inhouse} onDone={handleDone} />
            )}
          </div>
        </div>
      )}

      <div className="detail-grid">
        <InfoCard title="Order">
          <KV k="PO No" v={order.buyer_po} />
          <KV k="GSM" v={order.gsm} />
          <KV k="Composition" v={order.composition} />
          <KV k="Width" v={order.width} />
          <KV k="Required" v={`${order.required_kgs || '—'} kgs / ${order.required_meters || '—'} m`} />
          <KV k="Order Date" v={fmtDate(order.order_date)} />
          <KV k="Target Inhouse" v={fmtDate(order.target_date)} />
        </InfoCard>

        <InfoCard title="Yarn" action={
          <button className="info-action" onClick={() => setActiveStage('Yarn Received')}>
            {yarn ? 'Edit' : 'Add'}
          </button>
        }>
          {yarn ? <>
            <KV k="Supplier" v={yarn.supplier_name} />
            <KV k="Invoice" v={yarn.invoice_no} />
            <KV k="Type / Lot" v={`${yarn.yarn_type || '—'} / ${yarn.lot_no || '—'}`} />
            <KV k="Received" v={`${yarn.yarn_kgs} kgs`} />
            <KV k="Date" v={fmtDate(yarn.received_date)} />
          </> : <div className="muted">No yarn entry yet.</div>}
        </InfoCard>

        <InfoCard title="Inhouse" action={
          <button className="info-action" onClick={() => setActiveStage('Fabric Inhouse')}>
            {inhouse ? 'Edit' : 'Add'}
          </button>
        }>
          {inhouse ? <>
            <KV k="Date" v={fmtDate(inhouse.inhouse_date)} />
            <KV k="Final Kgs" v={inhouse.final_kgs} />
            <KV k="Rolls" v={inhouse.rolls} />
            <KV k="QC / Shade" v={`${inhouse.qc_status} / ${inhouse.shade_status}`} />
            <KV k="Rack" v={inhouse.rack_location} />
            <KV k="Total Days" v={`${inhouse.total_days}d`} />
          </> : <div className="muted">Not yet inhoused.</div>}
        </InfoCard>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Process Timeline</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th>Stage</th><th>Vendor</th><th>Inward</th><th>In Kgs</th>
              <th>Outward</th><th>Out Kgs</th><th>Rolls</th><th>Loss</th><th>Days</th><th></th>
            </tr></thead>
            <tbody>
              {PROCESS_STAGES.map(s => {
                const p = processes.find(x => x.process_name === s)
                if (!p) return (
                  <tr key={s}>
                    <td className="strong">{s}</td>
                    <td colSpan={7} className="muted">— not started —</td>
                    <td><button className="row-action" onClick={() => setActiveStage(s)}>+ Add</button></td>
                  </tr>
                )
                return (
                  <tr key={s}>
                    <td className="strong">{s}</td>
                    <td>{p.vendor_name || '—'}</td>
                    <td>{fmtDate(p.inward_date)}</td>
                    <td className="mono">{p.inward_kgs}</td>
                    <td>{fmtDate(p.outward_date)}</td>
                    <td className="mono">{p.outward_kgs || '—'}</td>
                    <td className="mono">{p.rolls || '—'}</td>
                    <td className={`mono ${num(p.loss_percent) > LOSS_LIMIT_PERCENT ? 'loss-high' : ''}`}>
                      {num(p.loss_kgs).toFixed(1)} / {num(p.loss_percent).toFixed(1)}%
                    </td>
                    <td className="mono">{p.days_taken || 0}d</td>
                    <td><button className="row-action" onClick={() => setActiveStage(s)}>Edit</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
