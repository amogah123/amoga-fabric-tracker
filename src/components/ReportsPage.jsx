import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { fetchAllOrderData } from '../lib/api'
import { getOrderStatus, daysBetween, today, num } from '../lib/utils'
import { LOSS_LIMIT_PERCENT } from '../lib/constants'
import { StatusPill, Loading, ErrorBox } from './ui'

export default function ReportsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [type, setType] = useState('job_wise')

  const load = () => { setError(null); fetchAllOrderData().then(setData).catch(e => setError(e.message)) }
  useEffect(load, [])

  const rows = useMemo(() => {
    if (!data) return []
    const { orders, yarns, processes, inhouses } = data
    return orders.map(o => {
      const y = yarns.find(x => x.order_id === o.id)
      const procs = processes.filter(x => x.order_id === o.id)
      const ih = inhouses.find(x => x.order_id === o.id)
      const s = getOrderStatus(o, y, procs, ih)
      const totalLossKgs = procs.reduce((sum, p) => sum + num(p.loss_kgs), 0)
      const totalLossPct = y && num(y.yarn_kgs) > 0 ? (totalLossKgs / num(y.yarn_kgs)) * 100 : 0
      const days = y ? daysBetween(y.received_date, ih ? ih.inhouse_date : today()) : 0
      return { o, y, procs, ih, status: s, totalLossKgs, totalLossPct, days }
    })
  }, [data])

  if (error) return <div className="page"><ErrorBox message={error} onRetry={load} /></div>
  if (!data) return <div className="page"><Loading /></div>

  const filtered = rows.filter(r => {
    if (type === 'delay') return r.status.code === 'red' || r.status.code === 'yellow'
    if (type === 'loss') return r.totalLossPct > LOSS_LIMIT_PERCENT
    if (type === 'buyer_pending') return !r.ih
    return true
  })

  const exportCSV = () => {
    const headers = ['Job No', 'Buyer', 'PO', 'Fabric', 'Colour', 'Req Kgs', 'Yarn Kgs', 'Inhouse Kgs', 'Loss %', 'Days', 'Status']
    const lines = [headers.join(',')]
    filtered.forEach(r => {
      lines.push([
        r.o.job_number, r.o.buyer_name, r.o.buyer_po, r.o.fabric_name, r.o.colour,
        r.o.required_kgs, r.y?.yarn_kgs || '', r.ih?.final_kgs || '',
        r.totalLossPct.toFixed(2), r.days, r.status.label
      ].map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `amoga-${type}-${today()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const reportTypes = [
    { id: 'job_wise', label: 'Job Wise' },
    { id: 'delay', label: 'Delay Report' },
    { id: 'loss', label: 'Loss Report' },
    { id: 'buyer_pending', label: 'Buyer Pending' },
    { id: 'monthly', label: 'Monthly Summary' },
  ]

  return (
    <div className="page">
      <div className="page-head">
        <div className="filter-chips" style={{ marginBottom: 0 }}>
          {reportTypes.map(r => (
            <button key={r.id} className={`chip ${type === r.id ? 'active' : ''}`} onClick={() => setType(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={exportCSV}><Download size={16} /> Export CSV</button>
      </div>

      {type === 'monthly' ? (
        <MonthlySummary rows={rows} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th>Job No</th><th>Buyer</th><th>Fabric</th><th>Colour</th>
              <th>Yarn Kgs</th><th>Inhouse Kgs</th><th>Loss %</th><th>Days</th><th>Status</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={9} className="muted" style={{ padding: 24, textAlign: 'center' }}>No data.</td></tr> :
                filtered.map(r => (
                  <tr key={r.o.id} onClick={() => navigate(`/orders/${r.o.id}`)} className="row-click">
                    <td className="mono strong">{r.o.job_number}</td>
                    <td>{r.o.buyer_name}</td>
                    <td>{r.o.fabric_name}</td>
                    <td>{r.o.colour}</td>
                    <td className="mono">{r.y?.yarn_kgs || '—'}</td>
                    <td className="mono">{r.ih?.final_kgs || '—'}</td>
                    <td className={`mono ${r.totalLossPct > LOSS_LIMIT_PERCENT ? 'loss-high' : ''}`}>{r.totalLossPct.toFixed(2)}%</td>
                    <td className="mono">{r.days}d</td>
                    <td><StatusPill status={r.status} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MonthlySummary({ rows }) {
  const byMonth = {}
  rows.forEach(r => {
    const d = r.o.order_date || ''
    const key = d.slice(0, 7)
    if (!key) return
    if (!byMonth[key]) byMonth[key] = { orders: 0, yarnKgs: 0, inhouseKgs: 0, completed: 0 }
    byMonth[key].orders++
    byMonth[key].yarnKgs += num(r.y?.yarn_kgs)
    byMonth[key].inhouseKgs += num(r.ih?.final_kgs)
    if (r.ih) byMonth[key].completed++
  })
  const keys = Object.keys(byMonth).sort().reverse()

  if (keys.length === 0) return <div className="empty-state"><div>No monthly data yet.</div></div>

  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Month</th><th>Orders</th><th>Completed</th><th>Yarn Kgs</th><th>Inhouse Kgs</th><th>Avg Loss %</th></tr></thead>
        <tbody>
          {keys.map(k => {
            const m = byMonth[k]
            const loss = m.yarnKgs > 0 ? ((m.yarnKgs - m.inhouseKgs) / m.yarnKgs) * 100 : 0
            return (
              <tr key={k}>
                <td className="strong">{k}</td>
                <td className="mono">{m.orders}</td>
                <td className="mono">{m.completed}</td>
                <td className="mono">{m.yarnKgs.toFixed(1)}</td>
                <td className="mono">{m.inhouseKgs.toFixed(1)}</td>
                <td className={`mono ${loss > LOSS_LIMIT_PERCENT ? 'loss-high' : ''}`}>{loss.toFixed(2)}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
