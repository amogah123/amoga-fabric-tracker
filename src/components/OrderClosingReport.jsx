import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { fetchOrderFull } from '../lib/api'
import { fmtDate, today, daysBetween, num, getActiveStages, getRollWarnings } from '../lib/utils'
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

  const { order, allocations, processes, inhouse } = data
  const stages = getActiveStages(order)
  const greyKgs = allocations.reduce((s, a) => s + num(a.allocated_kgs), 0)
  const totalLossP = greyKgs > 0 && inhouse ? ((greyKgs - num(inhouse.final_kgs)) / greyKgs) * 100 : 0
  const totalDays = inhouse ? daysBetween(order.order_date, inhouse.inhouse_date) : 0
  const rollWarnings = getRollWarnings(allocations, processes, inhouse, order)

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
          <h3>Grey Fabric Source (Knitting Batches)</h3>
          <table className="report-table">
            <thead><tr><th>Batch</th><th>Structure</th><th>Kgs Allocated</th><th>Rolls</th></tr></thead>
            <tbody>
              {allocations.map(a => (
                <tr key={a.id}>
                  <td className="mono">{a.knitting_batches?.batch_no}</td>
                  <td>{a.knitting_batches?.fabric_structure} {a.knitting_batches?.dia || ''}</td>
                  <td className="mono">{num(a.allocated_kgs).toFixed(1)}</td>
                  <td className="mono">{a.rolls || '—'}</td>
                </tr>
              ))}
              <tr><td colSpan={2} className="strong">TOTAL GREY FABRIC</td>
                <td className="mono strong">{greyKgs.toFixed(1)}</td>
                <td className="mono">{allocations.reduce((s, a) => s + num(a.rolls), 0) || '—'}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <h3>Process Timeline</h3>
          <table className="report-table">
            <thead><tr><th>Stage</th><th>Vendor</th><th>In Date</th><th>In Kgs</th><th>Out Date</th><th>Out Kgs</th><th>Rolls</th><th>Loss %</th></tr></thead>
            <tbody>
              {stages.map(s => {
                const p = processes.find(x => x.process_name === s)
                return <tr key={s}>
                  <td>{s}</td>
                  <td>{p?.vendor_name || '—'}</td>
                  <td>{fmtDate(p?.inward_date)}</td>
                  <td className="mono">{p?.inward_kgs || '—'}</td>
                  <td>{fmtDate(p?.outward_date)}</td>
                  <td className="mono">{p?.outward_kgs || '—'}</td>
                  <td className="mono">{p?.rolls || '—'}</td>
                  <td className="mono">{p?.loss_percent ? num(p.loss_percent).toFixed(2) + '%' : '—'}</td>
                </tr>
              })}
              <tr><td className="strong">Fabric Inhouse</td><td>Amoga FG Store</td>
                <td colSpan={2}>{fmtDate(inhouse?.inhouse_date)}</td>
                <td></td><td className="mono strong">{inhouse?.final_kgs || '—'}</td>
                <td className="mono">{inhouse?.rolls || '—'}</td><td>—</td></tr>
            </tbody>
          </table>
        </section>

        {rollWarnings.length > 0 && (
          <section className="report-section">
            <h3 style={{ color: '#B3261E' }}>⚠ Roll Count Discrepancies</h3>
            {rollWarnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: '#B3261E', padding: '3px 0' }}>{w.message}</div>
            ))}
          </section>
        )}

        <section className="report-section">
          <h3>Summary</h3>
          <table className="report-table">
            <tbody>
              <tr><td>Grey Fabric Allocated</td><td className="mono">{greyKgs.toFixed(1)} kgs</td>
                  <td>Inhouse Qty</td><td className="mono strong">{inhouse?.final_kgs || '—'} kgs</td></tr>
              <tr><td>Total Loss %</td><td className="mono strong">{totalLossP.toFixed(2)}%</td>
                  <td>Total Rolls</td><td className="mono">{inhouse?.rolls || '—'}</td></tr>
              <tr><td>QC / Shade</td><td>{inhouse ? `${inhouse.qc_status} / ${inhouse.shade_status}` : '—'}</td>
                  <td>Total Days</td><td className="mono">{totalDays} days</td></tr>
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
