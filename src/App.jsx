import React, { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useToast } from './components/ui'
import LoginPage from './components/LoginPage'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import YarnStockPage from './components/YarnStockPage'
import KnittingPage from './components/KnittingPage'
import OrdersList from './components/OrdersList'
import NewOrderForm from './components/NewOrderForm'
import ProcessEntryPage from './components/ProcessEntryPage'
import OrderDetail from './components/OrderDetail'
import OrderClosingReport from './components/OrderClosingReport'
import ReportsPage from './components/ReportsPage'
import SettingsPage from './components/SettingsPage'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast, showToast } = useToast()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="login-page"><div style={{ color: 'var(--ink-60)' }}>Connecting…</div></div>
  if (!session) return <LoginPage onLogin={setSession} />

  const userEmail = session.user.email

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout toast={toast} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/yarn" element={<YarnStockPage showToast={showToast} userEmail={userEmail} />} />
          <Route path="/knitting" element={<KnittingPage showToast={showToast} userEmail={userEmail} />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/new-order" element={<NewOrderForm showToast={showToast} />} />
          <Route path="/process-entry" element={<ProcessEntryPage showToast={showToast} userEmail={userEmail} />} />
          <Route path="/orders/:id" element={<OrderDetail showToast={showToast} userEmail={userEmail} />} />
          <Route path="/orders/:id/report" element={<OrderClosingReport />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage userEmail={userEmail} onLogout={() => setSession(null)} />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
