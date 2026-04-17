import { supabase } from './supabase'

// ============ ORDERS ============

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchOrder(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createOrder(orderData) {
  // Get next job number from DB function
  const { data: jobNo, error: rpcErr } = await supabase.rpc('next_job_number')
  if (rpcErr) throw rpcErr

  const { data, error } = await supabase
    .from('orders')
    .insert({ ...orderData, job_number: jobNo })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ YARN ============

export async function fetchYarn(orderId) {
  const { data, error } = await supabase
    .from('yarn_entries')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertYarn(yarnData) {
  // If it has an id, update; otherwise insert
  if (yarnData.id) {
    const { data, error } = await supabase
      .from('yarn_entries')
      .update(yarnData)
      .eq('id', yarnData.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('yarn_entries')
    .insert(yarnData)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ PROCESS ENTRIES ============

export async function fetchProcesses(orderId) {
  const { data, error } = await supabase
    .from('process_entries')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function upsertProcess(processData) {
  // Strip out generated columns — Postgres computes these
  const { loss_kgs, loss_percent, days_taken, ...clean } = processData

  const { data, error } = await supabase
    .from('process_entries')
    .upsert(clean, { onConflict: 'order_id,process_name' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ INHOUSE ============

export async function fetchInhouse(orderId) {
  const { data, error } = await supabase
    .from('inhouse_entries')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertInhouse(inhouseData) {
  if (inhouseData.id) {
    const { data, error } = await supabase
      .from('inhouse_entries')
      .update(inhouseData)
      .eq('id', inhouseData.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('inhouse_entries')
    .insert(inhouseData)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ FULL ORDER DATA (for detail page) ============

export async function fetchOrderFull(orderId) {
  const [order, yarn, processes, inhouse] = await Promise.all([
    fetchOrder(orderId),
    fetchYarn(orderId),
    fetchProcesses(orderId),
    fetchInhouse(orderId),
  ])
  return { order, yarn, processes, inhouse }
}

// ============ DASHBOARD AGGREGATION ============

export async function fetchAllOrderData() {
  // Fetch everything in parallel
  const [orders, yarns, processes, inhouses] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('yarn_entries').select('*'),
    supabase.from('process_entries').select('*'),
    supabase.from('inhouse_entries').select('*'),
  ])

  if (orders.error) throw orders.error
  return {
    orders: orders.data || [],
    yarns: yarns.data || [],
    processes: processes.data || [],
    inhouses: inhouses.data || [],
  }
}
