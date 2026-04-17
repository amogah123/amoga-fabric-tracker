import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { fetchOrderFull } from '../lib/api'
import { fmtDate, today, daysBetween, num } from '../lib/utils'
import { PROCESS_STAGES } from '../lib/constants'
import { Loading, ErrorBox } from './ui'

export default function OrderClosingReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOrderFull(id).then(setData).catch(e => setError(e.message))
  }, [id])

  if (error) return <div className="page"><ErrorBox message={error} /></div>
  if (!data) return <div className="page"><Loading /></div>

  const { order, yarn, processes, inhouse } = data
  const getP = (n) => processes.find(p => p.process_name === n)
  const totalLossKgs = processes.reduce((s, p) => s + num(p.loss_kgs), 0)
  const totalLossPct = yarn && num(yarn.yarn_kgs) > 0 ? (totalLossKgs / num(yarn.yarn_kgs)) * 100 : 0
  const totalDays = yarn && inhouse ? daysBetween(yarn.received_date, inhouse.inhouse_date) : 0

  return (
    <div className="page print-page">
      <div className="print-actions no-print">
        <button className="btn-ghost" onClick={() => navigate(`/orders/${id}`)}><ArrowLeft size={16} /> Back</button>
        <button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
      </div>

      <div className="report-sheet">
        <header className="report-header">
          <div className="report-brand">AMOGA EXPORTS</div>
          <div className="report-sub">Fabric Reconciliation · Order Closing Report</div>
        </header>

        <section className="report-meta">
          <div><span>Job No</span><strong className="mono">{order.job_number}</strong></div>
          <div><span>Report Date</span><strong>{fmtDate(today())}</strong></div>
          <div><span>Buyer</span><strong>{order.buyer_name}</strong></div>
          <div><span>PO No</span><strong className="mono">{order.buyer_po || '—'}</strong></div>
          <div><span>Fabric</span><strong>{order.fabric_name}</strong></div>
          <div><span>Colour</span><strong>{order.colour}</strong></div>
          <div><span>GSM</span><strong className="mono">{order.gsm}</strong></div>
          <div><span>Composition</span><strong>{order.composition}</strong></div>
        </section>

        <section className="report-section">
          <h3>Production Summary</h3>
          <table className="report-table">
            <tbody>
              <tr><td>Yarn Received</td><td className="mono">{yarn?.yarn_kgs || '—'} kgs</td>
                  <td>Knitted Qty</td><td className="mono">{getP('Knitting')?.outward_kgs || '—'} kgs</td></tr>
              <tr><td>Dyed Qty</td><td className="mono">{getP('Dyeing')?.outward_kgs || '—'} kgs</td>
                  <td>Finished Qty</td><td className="mono">{getP('Finishing')?.outward_kgs || getP('Stentering')?.outward_kgs || '—'} kgs</td></tr>
              <tr><td>Inhouse Qty</td><td className="mono strong">{inhouse?.final_kgs || '—'} kgs</td>
                  <td>Total Rolls</td><td className="mono">{inhouse?.rolls || '—'}</td></tr>
              <tr><td>Avg Roll Weight</td><td className="mono">{inhouse?.avg_roll_weight || '—'} kgs</td>
                  <td>Total Loss %</td><td className="mono strong">{totalLossPct.toFixed(2)}%</td></tr>
              <tr><td>Total Days</td><td className="mono" colSpan={3}>{totalDays} days</td></tr>
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <h3>Process Timeline</h3>
          <table className="report-table">
            <thead><tr><th>Stage</th><th>Date</th><th>Vendor</th><th>Kgs</th><th>Loss %</th></tr></thead>
            <tbody>
              <tr><td>Yarn Received</td><td>{fmtDate(yarn?.received_date)}</td><td>{yarn?.supplier_name || '—'}</td>
                  <td className="mono">{yarn?.yarn_kgs || '—'}</td><td>—</td></tr>
              {PROCESS_STAGES.map(s => {
                const p = getP(s)
                return <tr key={s}>
                  <td>{s}</td>
                  <td>{fmtDate(p?.outward_date || p?.inward_date)}</td>
                  <td>{p?.vendor_name || '—'}</td>
                  <td className="mono">{p?.outward_kgs || '—'}</td>
                  <td className="mono">{p?.loss_percent ? num(p.loss_percent).toFixed(2) + '%' : '—'}</td>
                </tr>
              })}
              <tr><td className="strong">Fabric Inhouse</td><td>{fmtDate(inhouse?.inhouse_date)}</td>
                  <td>Amoga FG Store</td><td className="mono strong">{inhouse?.final_kgs || '—'}</td><td>—</td></tr>
            </tbody>
          </table>
        </section>

        <footer className="report-signatures">
          <div className="sig"><div className="sig-line" />Fabric Manager</div>
          <div className="sig"><div className="sig-line" />Production Manager</div>
          <div className="sig"><div className="sig-line" />Approved By</div>
        </footer>
      </div>
    </div>
  )
}
