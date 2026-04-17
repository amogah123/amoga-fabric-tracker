import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, CheckCircle2, Clock, AlertTriangle,
  TrendingDown, Factory, ClipboardList, ChevronRight
} from 'lucide-react'
import { fetchAllOrderData } from '../lib/api'
import { getOrderStatus, getCurrentStage, daysBetween, today, num } from '../lib/utils'
import { StatusPill, Tile, Loading, ErrorBox, EmptyState } from './ui'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    fetchAllOrderData().then(setData).catch(e => setError(e.message))
  }
  useEffect(load, [])

  const stats = useMemo(() => {
    if (!data) return null
    const { orders, yarns, processes, inhouses } = data
    let open = 0, completed = 0, pending = 0, delayed = 0, excess = 0, todayKgs = 0, totalRolls = 0

    orders.forEach(o => {
      const y = yarns.find(x => x.order_id === o.id)
      const procs = processes.filter(x => x.order_id === o.id)
      const ih = inhouses.find(x => x.order_id === o.id)
      const s = getOrderStatus(o, y, procs, ih)

      if (ih) {
        completed++
        if (ih.inhouse_date === today()) todayKgs += num(ih.final_kgs)
        totalRolls += num(ih.rolls)
      } else {
        open++
        if (s.code === 'yellow') pending++
        if (s.code === 'red') {
          delayed++
          if (procs.some(p => num(p.loss_percent) > 7)) excess++
        }
      }
    })
    return { open, completed, pending, delayed, excess, todayKgs, totalRolls }
  }, [data])

  if (error) return <div className="page"><ErrorBox message={error} onRetry={load} /></div>
  if (!data) return <div className="page"><Loading /></div>

  const { orders, yarns, processes, inhouses } = data
  const recent = orders.slice(0, 8)

  const tiles = [
    { label: 'Open Orders', value: stats.open, tone: 'blue', Icon: Package },
    { label: 'Completed', value: stats.completed, tone: 'green', Icon: CheckCircle2 },
    { label: 'Pending', value: stats.pending, tone: 'yellow', Icon: Clock },
    { label: 'Delayed', value: stats.delayed, tone: 'red', Icon: AlertTriangle },
    { label: 'Excess Loss', value: stats.excess, tone: 'red', Icon: TrendingDown },
    { label: 'Today Inhouse Kgs', value: stats.todayKgs.toFixed(1), tone: 'neutral', Icon: Factory },
    { label: 'Total Rolls Inhouse', value: stats.totalRolls, tone: 'neutral', Icon: ClipboardList },
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
              <thead><tr>
                <th>Job No</th><th>Buyer</th><th>Colour</th><th>Stage</th><th>Days</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {recent.map(o => {
                  const y = yarns.find(x => x.order_id === o.id)
                  const procs = processes.filter(x => x.order_id === o.id)
                  const ih = inhouses.find(x => x.order_id === o.id)
                  const s = getOrderStatus(o, y, procs, ih)
                  const stage = getCurrentStage(y, procs, ih)
                  const startDate = y ? y.received_date : o.order_date
                  const days = daysBetween(startDate, ih ? ih.inhouse_date : today())
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
