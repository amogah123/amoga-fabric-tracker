import { LOSS_LIMIT_PERCENT, DELAY_DAYS, NEAR_TARGET_DAYS, PROCESS_STAGES } from './constants'

export const today = () => new Date().toISOString().slice(0, 10)

export const daysBetween = (a, b) => {
  if (!a || !b) return 0
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000))
}

export const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const num = (v) => (v === null || v === undefined || v === '') ? 0 : Number(v)

// ============ STATUS LOGIC ============

export function getOrderStatus(order, yarn, processes, inhouse) {
  if (inhouse) return { code: 'completed', label: 'COMPLETED', color: 'green' }

  const now = today()
  const target = order.target_date
  const daysLeft = target ? daysBetween(now, target) : null
  const overdue = target && new Date(now) > new Date(target)

  const excessLoss = processes.some(p => num(p.loss_percent) > LOSS_LIMIT_PERCENT)
  const stuck = processes.some(p => p.inward_date && !p.outward_date && daysBetween(p.inward_date, now) > DELAY_DAYS)

  if (overdue || excessLoss) return { code: 'red', label: 'EXCESS / DELAY', color: 'red' }
  if (stuck || (daysLeft !== null && daysLeft <= NEAR_TARGET_DAYS)) return { code: 'yellow', label: 'PENDING', color: 'yellow' }
  return { code: 'green', label: 'ON TRACK', color: 'green' }
}

export function getCurrentStage(yarn, processes, inhouse) {
  if (inhouse) return 'Fabric Inhouse'
  const done = PROCESS_STAGES.filter(s => processes.find(p => p.process_name === s && p.outward_date))
  if (done.length === 0) return yarn ? 'Yarn Received' : 'Pending Yarn'
  const inProgress = processes.find(p => p.inward_date && !p.outward_date)
  if (inProgress) return `${inProgress.process_name} (In Progress)`
  const lastDone = done[done.length - 1]
  const idx = PROCESS_STAGES.indexOf(lastDone)
  return idx < PROCESS_STAGES.length - 1 ? `Awaiting ${PROCESS_STAGES[idx + 1]}` : 'Awaiting Inhouse'
}

export function getNextStage(yarn, processes, inhouse) {
  if (inhouse) return null
  if (!yarn) return 'Yarn Received'
  for (const s of PROCESS_STAGES) {
    const p = processes.find(x => x.process_name === s)
    if (!p) return s
    if (!p.outward_date) return s
  }
  return 'Fabric Inhouse'
}
