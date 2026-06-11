import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, CheckCircle2, Clock, AlertTriangle,
  TrendingDown, Factory, Layers, Scissors, ChevronRight
} from 'lucide-react'
import { fetchAllOrderData, fetchYarnStock, fetchBatches } from '../lib/api'
import { getOrderStatus, getCurrentStage, daysBetween, today, num } from '../lib/utils'
import { StatusPill, Tile, Loading, ErrorBox, EmptyState } from './ui'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [yarn, setYarn] = useState([])
  const [batches, setBatches] = useState([])
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    Promise.all([fetchAllOrderData(), fetchYarnStock(), fetchBatches()])
      .then(([d, y, b]) => { setData(d); setYarn(y || []); setBatches(b || []) })
      .catch(e => setError(e.message))
  }
  useEffect(load, [])

  const stats = useMemo(() => {
    if (!data) return null
    const { orders, allocations, processes, inhouses } = data
    let open = 0, completed = 0, pending = 0, delayed = 0, excess = 0, todayKgs = 0
    orders.forEach(o => {
      const alloc = allocations.filter(a => a.order_id === o.id)
      const procs = processes.filter(p => p.order_id === o.id)
      const ih = inhouses.find(i => i.order_id === o.id)
      const s = getOrderStatus(o, alloc, procs, ih)
      if (ih) {
        completed++
        if (ih.inhouse_date === today()) todayKgs += num(ih.final_kgs)
      } else {
        open++
        if (s.code === 'yellow') pending++
        if (s.code === 'red') { delayed++; if (procs.some(p => num(p.loss_percent) > 7)) excess++ }
      }
    })
    const yarnBal = yarn.reduce((s, r) => s + num(r.balance_kgs), 0)
    const greyBal = batches.reduce((s, b) => s + Math.max(0, num(b.balance_kgs)), 0)
    return { open, completed, pending, delayed, excess, todayKgs, yarnBal, greyBal }
  }, [data, yarn, batches])

  if (error) return <div className="page"><ErrorBox message={error} onRetry={load} /></div>
  if (!data || !stats) return <div className="page"><Loading /></div>

  const { orders, allocations, processes, inhouses } = data
  const recent = orders.slice(0, 8)

  const tiles = [
    { label: 'Yarn Stock', value: stats.yarnBal.toFixed(0), sub: 'kgs', tone: 'blue', Icon: Layers },
    { label: 'Grey Fabric Stock', value: stats.greyBal.toFixed(0), sub: 'kgs', tone: 'blue', Icon: Scissors },
    { label: 'Open Orders', value: stats.open, tone: 'neutral', Icon: Package },
    { label: 'Completed', value: stats.completed, tone: 'green', Icon: CheckCircle2 },
    { label: 'Pending', value: stats.pending, tone: 'yellow', Icon: Clock },
    { label: 'Delayed', value: stats.delayed, tone: 'red', Icon: AlertTriangle },
    { label: 'Excess Loss', value: stats.excess, tone: 'red', Icon: TrendingDown },
    { label: 'Today Inhouse', value: stats.todayKgs.toFixed(0), sub: 'kgs', tone: 'green', Icon: Factory },
  ]

  return (
    <div className="page">
      <div className="tile-grid">
        {tiles.map(t => <Tile key={t.label} {...t} />)}
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Recent Orders</h2>
          <button className="btn-link" onClick={() => navigate('/orders')}>View all <ChevronRight size={14} /></button>
        </div>
        {recent.length === 0 ? (
          <EmptyState Icon={Package} message="No orders yet." action={
            <button className="btn-primary" onClick={() => navigate('/new-order')}>Create first order</button>
          } />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Job No</th><th>Buyer</th><th>Colour</th><th>Stage</th><th>Days</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {recent.map(o => {
                  const alloc = allocations.filter(a => a.order_id === o.id)
                  const procs = processes.filter(p => p.order_id === o.id)
                  const ih = inhouses.find(i => i.order_id === o.id)
                  const s = getOrderStatus(o, alloc, procs, ih)
                  const stage = getCurrentStage(alloc, procs, ih, o)
                  const days = daysBetween(o.order_date, ih ? ih.inhouse_date : today())
                  return (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="row-click">
                      <td className="mono">{o.job_number}</td>
                      <td>{o.buyer_name}</td>
                      <td>{o.colour}</td>
                      <td>{stage}</td>
                      <td className="mono">{days}d</td>
                      <td><StatusPill status={s} /></td>
                      <td><ChevronRight size={16} style={{ color: 'var(--ink-40)' }} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
