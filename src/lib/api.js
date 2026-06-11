import { supabase } from './supabase'

const q = async (promise) => {
  const { data, error } = await promise
  if (error) throw error
  return data
}

// ---------- ORDERS ----------
export const fetchOrders = () => q(supabase.from('orders').select('*').order('created_at', { ascending: false }))
export const fetchOrder = (id) => q(supabase.from('orders').select('*').eq('id', id).single())

export async function createOrder(orderData) {
  const jobNo = await q(supabase.rpc('next_job_number'))
  return q(supabase.from('orders').insert({ ...orderData, job_number: jobNo }).select().single())
}
export const updateOrder = (id, updates) => q(supabase.from('orders').update(updates).eq('id', id).select().single())

// ---------- YARN STOCK ----------
export const fetchYarnStock = () => q(supabase.from('v_yarn_stock_balance').select('*').order('invoice_date', { ascending: false }))
export const createYarnStock = (rows) => q(supabase.from('yarn_stock').insert(rows).select())
export const updateYarnStock = (id, updates) => q(supabase.from('yarn_stock').update(updates).eq('id', id).select().single())
export const deleteYarnStock = (id) => q(supabase.from('yarn_stock').delete().eq('id', id))

// ---------- KNITTING BATCHES ----------
export const fetchBatches = () => q(supabase.from('v_batch_balance').select('*').order('created_at', { ascending: false }))
export const fetchBatch = (id) => q(supabase.from('v_batch_balance').select('*').eq('id', id).single())

export async function nextBatchNo() {
  const rows = await q(supabase.from('knitting_batches').select('batch_no'))
  const max = (rows || []).reduce((m, r) => {
    const n = parseInt((r.batch_no || '').replace(/\D/g, ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 0)
  return `KB-${String(max + 1).padStart(3, '0')}`
}
export const createBatch = (data) => q(supabase.from('knitting_batches').insert(data).select().single())
export const updateBatch = (id, updates) => q(supabase.from('knitting_batches').update(updates).eq('id', id).select().single())

// Yarn pulled into a batch
export const fetchBatchYarn = (batchId) => q(
  supabase.from('batch_yarn_allocations')
    .select('*, yarn_stock(supplier_name, invoice_no, yarn_count, lot_no)')
    .eq('batch_id', batchId)
)
export const addBatchYarn = (data) => q(supabase.from('batch_yarn_allocations').insert(data).select().single())
export const deleteBatchYarn = (id) => q(supabase.from('batch_yarn_allocations').delete().eq('id', id))

// ---------- ORDER FABRIC ALLOCATIONS ----------
export const fetchOrderAllocations = (orderId) => q(
  supabase.from('order_fabric_allocations')
    .select('*, knitting_batches(batch_no, fabric_structure, dia, gsm)')
    .eq('order_id', orderId)
)
export const fetchAllAllocations = () => q(supabase.from('order_fabric_allocations').select('*'))
export const addOrderAllocation = (data) => q(supabase.from('order_fabric_allocations').insert(data).select().single())
export const updateOrderAllocation = (id, updates) => q(supabase.from('order_fabric_allocations').update(updates).eq('id', id).select().single())
export const deleteOrderAllocation = (id) => q(supabase.from('order_fabric_allocations').delete().eq('id', id))

// ---------- PROCESS ENTRIES ----------
export const fetchProcesses = (orderId) => q(
  supabase.from('process_entries').select('*').eq('order_id', orderId).order('created_at', { ascending: true })
)
export async function upsertProcess(processData) {
  const { loss_kgs, loss_percent, days_taken, ...clean } = processData
  return q(supabase.from('process_entries').upsert(clean, { onConflict: 'order_id,process_name' }).select().single())
}
export const unlockProcess = (id) => q(supabase.from('process_entries').update({ locked: false, locked_by: null, locked_at: null }).eq('id', id).select().single())

// ---------- INHOUSE ----------
export const fetchInhouse = (orderId) => q(supabase.from('inhouse_entries').select('*').eq('order_id', orderId).maybeSingle())
export async function upsertInhouse(inhouseData) {
  if (inhouseData.id) {
    return q(supabase.from('inhouse_entries').update(inhouseData).eq('id', inhouseData.id).select().single())
  }
  return q(supabase.from('inhouse_entries').insert(inhouseData).select().single())
}
export const unlockInhouse = (id) => q(supabase.from('inhouse_entries').update({ locked: false, locked_by: null, locked_at: null }).eq('id', id).select().single())

// ---------- AGGREGATES ----------
export async function fetchOrderFull(orderId) {
  const [order, allocations, processes, inhouse] = await Promise.all([
    fetchOrder(orderId),
    fetchOrderAllocations(orderId),
    fetchProcesses(orderId),
    fetchInhouse(orderId),
  ])
  return { order, allocations: allocations || [], processes: processes || [], inhouse }
}

export async function fetchAllOrderData() {
  const [orders, allocations, processes, inhouses] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('order_fabric_allocations').select('*'),
    supabase.from('process_entries').select('*'),
    supabase.from('inhouse_entries').select('*'),
  ])
  if (orders.error) throw orders.error
  return {
    orders: orders.data || [],
    allocations: allocations.data || [],
    processes: processes.data || [],
    inhouses: inhouses.data || [],
  }
}
