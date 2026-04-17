import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllOrderData, fetchOrderFull } from '../lib/api'
import { STAGES, PROCESS_STAGES } from '../lib/constants'
import { Loading, ErrorBox } from './ui'
import { YarnEntryForm, ProcessEntryForm, InhouseEntryForm } from './EntryForms'

export default function ProcessEntryPage({ showToast }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)
  const [orderId, setOrderId] = useState('')
  const [stage, setStage] = useState('Yarn Received')
  const [orderData, setOrderData] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Load open orders for dropdown
  useEffect(() => {
    fetchAllOrderData()
      .then(d => setOrders(d))
      .catch(e => setError(e.message))
  }, [])

  // Load order detail when selected
  useEffect(() => {
    if (!orderId) { setOrderData(null); return }
    setLoadingDetail(true)
    fetchOrderFull(orderId)
      .then(setOrderData)
      .catch(e => setError(e.message))
      .finally(() => setLoadingDetail(false))
  }, [orderId])

  const handleDone = (msg) => {
    showToast(msg)
    // Reload detail
    fetchOrderFull(orderId).then(setOrderData)
  }

  if (error) return <div className="page"><ErrorBox message={error} /></div>
  if (!orders) return <div className="page"><Loading /></div>

  const openOrders = orders.orders.filter(o => !orders.inhouses.find(i => i.order_id === o.id))

  // Derive existing entries from loaded detail
  const yarn = orderData?.yarn
  const existingProc = orderData ? orderData.processes.find(p => p.process_name === stage) : null
  const existingInhouse = orderData?.inhouse

  // Suggested inward from previous stage
  const suggestedInward = useMemo(() => {
    if (!orderData || stage === 'Yarn Received') return null
    if (stage === 'Knitting') return yarn?.yarn_kgs
    const idx = PROCESS_STAGES.indexOf(stage)
    if (idx <= 0) return null
    const prev = orderData.processes.find(p => p.process_name === PROCESS_STAGES[idx - 1])
    return prev?.outward_kgs
  }, [stage, orderData])

  return (
    <div className="page">
      <div className="pe-card">
        <div className="pe-step">
          <div className="pe-step-num">1</div>
          <div className="pe-step-label">Select Job Number</div>
        </div>
        <select className="big-select" value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">— Choose an order —</option>
          {openOrders.map(o =>
            <option key={o.id} value={o.id}>{o.job_number} · {o.buyer_name} · {o.colour}</option>
          )}
        </select>

        {orderId && !loadingDetail && (
          <>
            <div className="pe-step">
              <div className="pe-step-num">2</div>
              <div className="pe-step-label">Choose Stage</div>
            </div>
            <div className="stage-grid">
              {STAGES.map(s => (
                <button key={s} className={`stage-btn ${stage === s ? 'active' : ''}`} onClick={() => setStage(s)}>
                  {s}
                </button>
              ))}
            </div>

            <div className="pe-step">
              <div className="pe-step-num">3</div>
              <div className="pe-step-label">Enter Details</div>
            </div>

            {stage === 'Yarn Received' && (
              <YarnEntryForm orderId={orderId} existing={yarn} onDone={handleDone} />
            )}
            {PROCESS_STAGES.includes(stage) && (
              <ProcessEntryForm orderId={orderId} stage={stage} existing={existingProc}
                suggestedInward={suggestedInward} onDone={handleDone} />
            )}
            {stage === 'Fabric Inhouse' && (
              <InhouseEntryForm orderId={orderId} yarn={yarn} existing={existingInhouse} onDone={handleDone} />
            )}

            <button className="btn-view-order" onClick={() => navigate(`/orders/${orderId}`)}>
              View full order detail →
            </button>
          </>
        )}

        {loadingDetail && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-40)' }}>Loading order…</div>}
      </div>
    </div>
  )
}
