import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PlusCircle, Filter } from 'lucide-react'
import { fetchAllOrderData } from '../lib/api'
import { getOrderStatus, getCurrentStage, daysBetween, today, num } from '../lib/utils'
import { LOSS_LIMIT_PERCENT } from '../lib/constants'
import { StatusPill, Loading, ErrorBox, EmptyState } from './ui'

export default function OrdersList() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const load = () => {
    setError(null)
    fetchAllOrderData().then(setData).catch(e => setError(e.message))
  }
  useEffect(load, [])

  if (error) return <div className="page"><ErrorBox message={error} onRetry={load} /></div>
  if (!data) return <div className="page"><Loading /></div>

  const { orders, yarns, processes, inhouses } = data

  const enriched = orders.map(o => {
    const y = yarns.find(x => x.order_id === o.id)
    const procs = processes.filter(x => x.order_id === o.id)
    const ih = inhouses.find(x => x.order_id === o.id)
    const s = getOrderStatus(o, y, procs, ih)
    const stage = getCurrentStage(y, procs, ih)
    const startDate = y ? y.received_date : o.order_date
    const days = daysBetween(startDate, ih ? ih.inhouse_date : today())
    return { ...o, _status: s, _stage: stage, _days: days, _completed: !!ih }
  })

  const filtered = enriched.filter(o => {
    if (filter === 'open' && o._completed) return false
    if (filter === 'completed' && !o._completed) return false
    if (filter === 'delayed' && o._status.code !== 'red') return false
    if (filter === 'pending' && o._status.code !== 'yellow') return false
    if (q) {
      const hay = `${o.job_number} ${o.buyer_name} ${o.buyer_po} ${o.fabric_name} ${o.colour}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="page">
      <div className="page-head">
        <div className="search-row">
          <div className="search">
            <Search size={16} />
            <input placeholder="Search job no, buyer, PO, fabric…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => navigate('/new-order')}>
            <PlusCircle size={16} /> New Order
          </button>
        </div>
        <div className="filter-chips">
          {['all', 'open', 'pending', 'delayed', 'completed'].map(f => (
            <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState Icon={Filter} message="No orders match your filters." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th>Job No</th><th>Buyer</th><th>PO</th><th>Fabric</th><th>Colour</th>
              <th>Req Kgs</th><th>Target</th><th>Stage</th><th>Days</th><th>Status</th>
            </tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="row-click">
                  <td className="mono strong">{o.job_number}</td>
                  <td>{o.buyer_name}</td>
                  <td className="mono">{o.buyer_po}</td>
                  <td>{o.fabric_name}</td>
                  <td>{o.colour}</td>
                  <td className="mono">{o.required_kgs}</td>
                  <td className="mono">{o._completed ? '—' : (o.target_date ? new Date(o.target_date+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—')}</td>
                  <td>{o._stage}</td>
                  <td className="mono">{o._days}d</td>
                  <td><StatusPill status={o._status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
