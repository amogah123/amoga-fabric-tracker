import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, Printer, X } from 'lucide-react'
import { fetchOrderFull, unlockProcess, unlockInhouse, updateOrder } from '../lib/api'
import { getOrderStatus, getNextStage, getActiveStages, getRollWarnings, fmtDate, num, isAdmin } from '../lib/utils'
import { LOSS_LIMIT_PERCENT } from '../lib/constants'
import { StatusPill, InfoCard, KV, Loading, ErrorBox, RollWarningBanner, LockBadge } from './ui'
import { AllocationForm, ProcessEntryForm, InhouseConfirmForm } from './EntryForms'

export default function OrderDetail({ showToast, userEmail }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [activeStage, setActiveStage] = useState(null)

  const load = () => { setError(null); fetchOrderFull(id).then(setData).catch(e => setError(e.message)) }
  useEffect(load, [id])

  if (error) return <div className="page"><ErrorBox message={error} onRetry={load} /></div>
  if (!data) return <div className="page"><Loading /></div>

  const { order, allocations, processes, inhouse } = data
  const status = getOrderStatus(order, allocations, processes, inhouse)
  const nextStage = getNextStage(allocations, processes, inhouse, order)
  const stages = getActiveStages(order)
  const rollWarnings = getRollWarnings(allocations, processes, inhouse, order)
  const admin = isAdmin(userEmail)

  const greyKgs = allocations.reduce((s, a) => s + num(a.allocated_kgs), 0)

  const handleDone = (msg) => { showToast(msg); setActiveStage(null); load() }
  const handleAllocDone = (msg) => { showToast(msg); load() }

  const doUnlock = async (kind, entryId) => {
    try {
      if (kind === 'process') await unlockProcess(entryId)
      if (kind === 'inhouse') await unlockInhouse(entryId)
      showToast('Unlocked for editing')
      load()
    } catch (e) { alert('Error: ' + e.message) }
  }

  const toggleCombo = async () => {
    if (processes.length > 0) { alert('Cannot change after process entries exist.'); return }
    try {
      await updateOrder(order.id, { dyeing_stenter_combined: !order.dyeing_stenter_combined })
      showToast('Updated')
      load()
    } catch (e) { alert('Error: ' + e.message) }
  }

  const existingProc = activeStage ? processes.find(p => p.process_name === activeStage) : null

  const suggestedInwardFor = (stage) => {
    const idx = stages.indexOf(stage)
    if (idx === 0) return greyKgs || null
    const prev = processes.find(p => p.process_name === stages[idx - 1])
    return prev?.outward_kgs
  }

  const prevRollsFor = (stage) => {
    const idx = stages.indexOf(stage)
    if (idx === 0) {
      const allocRolls = (allocations || []).reduce((s, a) => s + num(a.rolls || 0), 0)
      return allocRolls > 0 ? { rolls: allocRolls, name: 'Knitting (allocated)' } : null
    }
    const prev = processes.find(p => p.process_name === stages[idx - 1])
    return prev?.rolls ? { rolls: prev.rolls, name: stages[idx - 1] } : null
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
          {nextStage && nextStage !== 'Grey Fabric' && (
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

      <RollWarningBanner warnings={rollWarnings} />

      {activeStage && activeStage !== 'Grey Fabric' && (
        <div className="inline-form-card">
          <div className="inline-form-head">
            <div>
              <div className="inline-form-title">{activeStage}</div>
              <div className="inline-form-sub">{order.job_number} · {order.buyer_name}</div>
            </div>
            <button className="btn-icon" onClick={() => setActiveStage(null)}><X size={18} /></button>
          </div>
          <div style={{ padding: 20 }}>
            {stages.includes(activeStage) && (
              <ProcessEntryForm orderId={order.id} stage={activeStage} existing={existingProc}
                suggestedInward={suggestedInwardFor(activeStage)}
                prevRolls={prevRollsFor(activeStage)?.rolls} prevStageName={prevRollsFor(activeStage)?.name}
                userEmail={userEmail} onDone={handleDone} />
            )}
            {activeStage === 'Inhouse' && (
              <InhouseConfirmForm orderId={order.id} order={order} allocations={allocations}
                processes={processes} existing={inhouse} userEmail={userEmail} onDone={handleDone} />
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
          <KV k="Required" v={`${order.required_kgs || '—'} kgs`} />
          <KV k="Order Date" v={fmtDate(order.order_date)} />
          <KV k="Target Inhouse" v={fmtDate(order.target_date)} />
          <div className="kv">
            <span className="kv-k">Dye+Stenter combined</span>
            <span className="kv-v">
              {order.dyeing_stenter_combined ? 'Yes' : 'No'}
              {admin && processes.length === 0 && (
                <button className="row-action" style={{ marginLeft: 8 }} onClick={toggleCombo}>Change</button>
              )}
            </span>
          </div>
        </InfoCard>

        <InfoCard title={`Grey Fabric · ${greyKgs.toFixed(1)} kgs`}>
          <AllocationForm orderId={order.id} allocations={allocations} userEmail={userEmail} onDone={handleAllocDone} />
        </InfoCard>

        <InfoCard title="Inhouse" action={
          <button className="info-action" onClick={() => setActiveStage('Inhouse')}>
            {inhouse ? 'View / Edit' : 'Confirm'}
          </button>
        }>
          {inhouse ? <>
            <div style={{ marginBottom: 6 }}><LockBadge entry={inhouse} isAdminUser={admin} onUnlock={() => doUnlock('inhouse', inhouse.id)} /></div>
            <KV k="Date" v={fmtDate(inhouse.inhouse_date)} />
            <KV k="Final Kgs" v={inhouse.final_kgs} />
            <KV k="Rolls" v={inhouse.rolls} />
            <KV k="QC / Shade" v={`${inhouse.qc_status} / ${inhouse.shade_status}`} />
            <KV k="Rack" v={inhouse.rack_location} />
          </> : <div className="muted">Not yet inhoused. Complete all processes, then confirm.</div>}
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
              <tr>
                <td className="strong">Grey Fabric</td>
                <td colSpan={2}>{allocations.length} batch allocation{allocations.length !== 1 ? 's' : ''}</td>
                <td className="mono strong">{greyKgs.toFixed(1)}</td>
                <td colSpan={2}></td>
                <td className="mono">{allocations.reduce((s, a) => s + num(a.rolls), 0) || '—'}</td>
                <td colSpan={3}></td>
              </tr>
              {stages.map(s => {
                const p = processes.find(x => x.process_name === s)
                if (!p) return (
                  <tr key={s}>
                    <td className="strong">{s}</td>
                    <td colSpan={8} className="muted">— not started —</td>
                    <td><button className="row-action" onClick={() => setActiveStage(s)}>+ Add</button></td>
                  </tr>
                )
                return (
                  <tr key={s}>
                    <td className="strong">{s} {p.locked && '🔒'}</td>
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
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="row-action" onClick={() => setActiveStage(s)}>{p.locked && !admin ? 'View' : 'Edit'}</button>
                      {p.locked && admin && (
                        <button className="row-action" style={{ marginLeft: 6 }} onClick={() => doUnlock('process', p.id)}>Unlock</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td className="strong">Inhouse {inhouse?.locked && '🔒'}</td>
                {inhouse ? <>
                  <td>Amoga FG Store</td>
                  <td>{fmtDate(inhouse.inhouse_date)}</td>
                  <td className="mono strong">{inhouse.final_kgs}</td>
                  <td colSpan={2}></td>
                  <td className="mono">{inhouse.rolls || '—'}</td>
                  <td colSpan={2}></td>
                  <td><button className="row-action" onClick={() => setActiveStage('Inhouse')}>View</button></td>
                </> : <>
                  <td colSpan={8} className="muted">— pending —</td>
                  <td><button className="row-action" onClick={() => setActiveStage('Inhouse')}>Confirm</button></td>
                </>}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
