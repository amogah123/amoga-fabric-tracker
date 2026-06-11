import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { fetchAllOrderData, fetchYarnStock, fetchBatches } from '../lib/api'
import { getOrderStatus, daysBetween, today, num, fmtDate } from '../lib/utils'
import { LOSS_LIMIT_PERCENT } from '../lib/constants'
import { StatusPill, Loading, ErrorBox } from './ui'

export default function ReportsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [yarn, setYarn] = useState([])
  const [batches, setBatches] = useState([])
  const [error, setError] = useState(null)
  const [type, setType] = useState('job_wise')

  const load = () => {
    setError(null)
    Promise.all([fetchAllOrderData(), fetchYarnStock(), fetchBatches()])
      .then(([d, y, b]) => { setData(d); setYarn(y || []); setBatches(b || []) })
      .catch(e => setError(e.message))
  }
  useEffect(load, [])

  const rows = useMemo(() => {
    if (!data) return []
    const { orders, allocations, processes, inhouses } = data
    return orders.map(o => {
      const alloc = allocations.filter(a => a.order_id === o.id)
      const procs = processes.filter(p => p.order_id === o.id)
      const ih = inhouses.find(i => i.order_id === o.id)
      const s = getOrderStatus(o, alloc, procs, ih)
      const greyKgs = alloc.reduce((sum, a) => sum + num(a.allocated_kgs), 0)
      const totalLossPct = greyKgs > 0 && ih ? ((greyKgs - num(ih.final_kgs)) / greyKgs) * 100 : 0
      const days = daysBetween(o.order_date, ih ? ih.inhouse_date : today())
      return { o, alloc, procs, ih, status: s, greyKgs, totalLossPct, days }
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
    let lines = []
    if (type === 'yarn_bill') {
      lines.push('Invoice,Date,Supplier,Count,Lot,Received Kgs,Used Kgs,Balance Kgs')
      yarn.forEach(r => lines.push([r.invoice_no, r.invoice_date, r.supplier_name, r.yarn_count, r.lot_no, r.total_kgs, r.used_kgs, r.balance_kgs]
        .map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(',')))
    } else {
      lines.push('Job No,Buyer,PO,Fabric,Colour,Grey Kgs,Inhouse Kgs,Loss %,Days,Status')
      filtered.forEach(r => lines.push([
        r.o.job_number, r.o.buyer_name, r.o.buyer_po, r.o.fabric_name, r.o.colour,
        r.greyKgs.toFixed(1), r.ih?.final_kgs || '', r.totalLossPct.toFixed(2), r.days, r.status.label
      ].map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(',')))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `amoga-${type}-${today()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const reportTypes = [
    { id: 'job_wise', label: 'Job Wise' },
    { id: 'yarn_bill', label: 'Yarn Bill Report' },
    { id: 'delay', label: 'Delay Report' },
    { id: 'loss', label: 'Loss Report' },
    { id: 'buyer_pending', label: 'Buyer Pending' },
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

      {type === 'yarn_bill' ? (
        <div className="table-wrap panel">
          <table className="table">
            <thead><tr>
              <th>Invoice</th><th>Date</th><th>Supplier</th><th>Count</th>
              <th>Received</th><th>Used</th><th>Balance</th><th>Status</th>
            </tr></thead>
            <tbody>
              {yarn.length === 0 ? <tr><td colSpan={8} className="muted" style={{ padding: 24, textAlign: 'center' }}>No yarn data.</td></tr> :
                yarn.map(r => (
                  <tr key={r.id}>
                    <td className="mono strong">{r.invoice_no}</td>
                    <td>{fmtDate(r.invoice_date)}</td>
                    <td>{r.supplier_name}</td>
                    <td>{r.yarn_count}</td>
                    <td className="mono">{num(r.total_kgs).toFixed(1)}</td>
                    <td className="mono">{num(r.used_kgs).toFixed(1)}</td>
                    <td className="mono strong">{num(r.balance_kgs).toFixed(1)}</td>
                    <td>{num(r.balance_kgs) <= 0
                      ? <span className="pill pill-green"><span className="pill-dot" />CLOSED</span>
                      : <span className="pill pill-yellow"><span className="pill-dot" />OPEN</span>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap panel">
          <table className="table">
            <thead><tr>
              <th>Job No</th><th>Buyer</th><th>Fabric</th><th>Colour</th>
              <th>Grey Kgs</th><th>Inhouse Kgs</th><th>Loss %</th><th>Days</th><th>Status</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={9} className="muted" style={{ padding: 24, textAlign: 'center' }}>No data.</td></tr> :
                filtered.map(r => (
                  <tr key={r.o.id} onClick={() => navigate(`/orders/${r.o.id}`)} className="row-click">
                    <td className="mono strong">{r.o.job_number}</td>
                    <td>{r.o.buyer_name}</td>
                    <td>{r.o.fabric_name}</td>
                    <td>{r.o.colour}</td>
                    <td className="mono">{r.greyKgs.toFixed(1)}</td>
                    <td className="mono">{r.ih?.final_kgs || '—'}</td>
                    <td className={`mono ${r.totalLossPct > LOSS_LIMIT_PERCENT ? 'loss-high' : ''}`}>{r.totalLossPct.toFixed(2)}%</td>
                    <td className="mono">{r.days}d</td>
                    <td><StatusPill status={r.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
