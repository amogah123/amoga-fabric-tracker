import { LOSS_LIMIT_PERCENT, DELAY_DAYS, NEAR_TARGET_DAYS, PROCESS_STAGES, COMBINED_STAGE, ADMIN_EMAIL } from './constants'

export const today = () => new Date().toISOString().slice(0, 10)
export const daysBetween = (a, b) => (!a || !b) ? 0 : Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000))
export const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const num = (v) => (v === null || v === undefined || v === '') ? 0 : Number(v)

// Stages for a specific order (respects the Dyeing+Stentering combo toggle)
export function getActiveStages(order) {
  if (order?.dyeing_stenter_combined) {
    return [COMBINED_STAGE, 'Compacting', 'Finishing']
  }
  return [...PROCESS_STAGES]
}

export function getOrderStatus(order, allocations, processes, inhouse) {
  if (inhouse) return { code: 'completed', label: 'COMPLETED', color: 'green' }
  const now = today()
  const overdue = order.target_date && new Date(now) > new Date(order.target_date)
  const daysLeft = order.target_date ? daysBetween(now, order.target_date) : null
  const excessLoss = (processes || []).some(p => num(p.loss_percent) > LOSS_LIMIT_PERCENT)
  const stuck = (processes || []).some(p => p.inward_date && !p.outward_date && daysBetween(p.inward_date, now) > DELAY_DAYS)
  if (overdue || excessLoss) return { code: 'red', label: 'EXCESS / DELAY', color: 'red' }
  if (stuck || (daysLeft !== null && daysLeft <= NEAR_TARGET_DAYS)) return { code: 'yellow', label: 'PENDING', color: 'yellow' }
  return { code: 'green', label: 'ON TRACK', color: 'green' }
}

export function getCurrentStage(allocations, processes, inhouse, order) {
  if (inhouse) return 'Inhouse'
  if (!allocations || allocations.length === 0) return 'Awaiting Grey Fabric'
  const stages = getActiveStages(order)
  const inProgress = (processes || []).find(p => p.inward_date && !p.outward_date)
  if (inProgress) return `${inProgress.process_name} (In Progress)`
  for (const s of stages) {
    const p = (processes || []).find(x => x.process_name === s)
    if (!p || !p.outward_date) return `Awaiting ${s}`
  }
  return 'Awaiting Inhouse'
}

export function getNextStage(allocations, processes, inhouse, order) {
  if (inhouse) return null
  if (!allocations || allocations.length === 0) return 'Grey Fabric'
  const stages = getActiveStages(order)
  for (const s of stages) {
    const p = (processes || []).find(x => x.process_name === s)
    if (!p || !p.outward_date) return s
  }
  return 'Inhouse'
}

// RED warnings when roll count drops along the chain
export function getRollWarnings(allocations, processes, inhouse, order) {
  const warnings = []
  const chain = []
  const allocRolls = (allocations || []).reduce((s, a) => s + num(a.rolls), 0)
  if (allocRolls > 0) chain.push({ name: 'Grey Fabric', rolls: allocRolls })
  for (const s of getActiveStages(order)) {
    const p = (processes || []).find(x => x.process_name === s)
    if (p && num(p.rolls) > 0) chain.push({ name: s, rolls: num(p.rolls) })
  }
  if (inhouse && num(inhouse.rolls) > 0) chain.push({ name: 'Inhouse', rolls: num(inhouse.rolls) })
  for (let i = 1; i < chain.length; i++) {
    if (chain[i].rolls < chain[i - 1].rolls) {
      const missing = chain[i - 1].rolls - chain[i].rolls
      warnings.push({
        missing,
        message: `${missing} roll${missing > 1 ? 's' : ''} missing — ${chain[i - 1].name} had ${chain[i - 1].rolls}, ${chain[i].name} has ${chain[i].rolls}`
      })
    }
  }
  return warnings
}

// Lock system
export const isAdmin = (email) => email === ADMIN_EMAIL
export const canEdit = (email, entry) => isAdmin(email) || !entry?.locked
export const lockFields = (email) => isAdmin(email) ? {} : { locked: true, locked_by: email, locked_at: new Date().toISOString() }
