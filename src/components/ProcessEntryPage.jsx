import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllOrderData, fetchOrderFull } from '../lib/api'
import { getActiveStages, num } from '../lib/utils'
import { Loading, ErrorBox } from './ui'
import { ProcessEntryForm, InhouseConfirmForm } from './EntryForms'

export default function ProcessEntryPage({ showToast, userEmail }) {
  const navigate = useNavigate()
  const [allData, setAllData] = useState(null)
  const [error, setError] = useState(null)
  const [orderId, setOrderId] = useState('')
  const [stage, setStage] = useState('')
  const [orderData, setOrderData] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    fetchAllOrderData().then(setAllData).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (!orderId) { setOrderData(null); setStage(''); return }
    setLoadingDetail(true)
    fetchOrderFull(orderId)
      .then(d => { setOrderData(d); setStage('') })
      .catch(e => setError(e.message))
      .finally(() => setLoadingDetail(false))
  }, [orderId])

  const openOrders = useMemo(() => {
    if (!allData) return []
    return allData.orders.filter(o => !allData.inhouses.find(i => i.order_id === o.id))
  }, [allData])

  const stages = useMemo(() => orderData ? [...getActiveStages(orderData.order), 'Inhouse'] : [], [orderData])

  const greyKgs = useMemo(() =>
    orderData ? (orderData.allocations || []).reduce((s, a) => s + num(a.allocated_kgs), 0) : 0
  , [orderData])

  const existingProc = orderData && stage ? (orderData.processes || []).find(p => p.process_name === stage) || null : null

  const suggestedInward = useMemo(() => {
    if (!orderData || !stage || stage === 'Inhouse') return null
    const activeStages = getActiveStages(orderData.order)
    const idx = activeStages.indexOf(stage)
    if (idx === 0) return greyKgs || null
    if (idx <= 0) return null
    const prev = (orderData.processes || []).find(p => p.process_name === activeStages[idx - 1])
    return prev?.outward_kgs
  }, [stage, orderData, greyKgs])

  const prevRollsInfo = useMemo(() => {
    if (!orderData || !stage || stage === 'Inhouse') return null
    const activeStages = getActiveStages(orderData.order)
    const idx = activeStages.indexOf(stage)
    if (idx === 0) {
      const allocRolls = (orderData.allocations || []).reduce((s, a) => s + num(a.rolls || 0), 0)
      return allocRolls > 0 ? { rolls: allocRolls, name: 'Knitting (allocated)' } : null
    }
    if (idx <= 0) return null
    const prev = (orderData.processes || []).find(p => p.process_name === activeStages[idx - 1])
    return prev?.rolls ? { rolls: prev.rolls, name: activeStages[idx - 1] } : null
  }, [stage, orderData])

  const handleDone = (msg) => {
    showToast(msg)
    if (orderId) fetchOrderFull(orderId).then(setOrderData)
  }

  if (error) return <div className="page"><ErrorBox message={error} /></div>
  if (!allData) return <div className="page"><Loading /></div>

  return (
    <div className="page">
      <div className="pe-card">
        <div className="pe-step"><div className="pe-step-num">1</div><div className="pe-step-label">Select Job Number</div></div>
        <select className="big-select" value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">— Choose an order —</option>
          {openOrders.map(o =>
            <option key={o.id} value={o.id}>{o.job_number} · {o.buyer_name} · {o.colour}</option>
          )}
        </select>

        {orderId && !loadingDetail && orderData && (
          <>
            {greyKgs === 0 && (
              <div className="locked-banner" style={{ marginTop: 14 }}>
                ⚠ No grey fabric allocated yet. Go to the order page to allocate fabric from a knitting batch first.
                <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => navigate(`/orders/${orderId}`)}>Open order</button>
              </div>
            )}

            <div className="pe-step"><div className="pe-step-num">2</div><div className="pe-step-label">Choose Stage</div></div>
            <div className="stage-grid">
              {stages.map(s => (
                <button key={s} className={`stage-btn ${stage === s ? 'active' : ''}`} onClick={() => setStage(s)}>
                  {s}
                </button>
              ))}
            </div>

            {stage && (
              <>
                <div className="pe-step"><div className="pe-step-num">3</div><div className="pe-step-label">Enter Details</div></div>
                {stage !== 'Inhouse' && (
                  <ProcessEntryForm orderId={orderId} stage={stage} existing={existingProc}
                    suggestedInward={suggestedInward}
                    prevRolls={prevRollsInfo?.rolls} prevStageName={prevRollsInfo?.name}
                    userEmail={userEmail} onDone={handleDone} />
                )}
                {stage === 'Inhouse' && (
                  <InhouseConfirmForm orderId={orderId} order={orderData.order}
                    allocations={orderData.allocations} processes={orderData.processes}
                    existing={orderData.inhouse} userEmail={userEmail} onDone={handleDone} />
                )}
              </>
            )}

            <button className="btn-view-order" onClick={() => navigate(`/orders/${orderId}`)}>
              View full order detail →
            </button>
          </>
        )}
        {loadingDetail && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-40)' }}>Loading order…</div>}
      </div>
    </div>
  )
}
