import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, PlusCircle, ClipboardList,
  FileText, Settings, Factory, Menu as MenuIcon, X
} from 'lucide-react'
import { Toast } from './ui'

const NAV = [
  { to: '/',              label: 'Dashboard',     Icon: LayoutDashboard },
  { to: '/orders',        label: 'Orders',        Icon: Package },
  { to: '/new-order',     label: 'New Order',     Icon: PlusCircle },
  { to: '/process-entry', label: 'Process Entry', Icon: ClipboardList },
  { to: '/reports',       label: 'Reports',       Icon: FileText },
  { to: '/settings',      label: 'Settings',      Icon: Settings },
]

const BOTTOM_NAV = [
  { to: '/',              label: 'Home',    Icon: LayoutDashboard },
  { to: '/orders',        label: 'Orders',  Icon: Package },
  { to: '/process-entry', label: 'Add',     Icon: PlusCircle, primary: true },
  { to: '/reports',       label: 'Reports', Icon: FileText },
  { to: '/settings',      label: 'Menu',    Icon: Settings },
]

export default function Layout({ toast }) {
  const [sideOpen, setSideOpen] = useState(false)
  const location = useLocation()

  const pageTitle = (() => {
    const map = {
      '/': 'Dashboard', '/orders': 'All Orders', '/new-order': 'Create New Order',
      '/process-entry': 'Process Entry', '/reports': 'Reports', '/settings': 'Settings',
    }
    if (location.pathname.includes('/report')) return 'Order Closing Report'
    if (location.pathname.startsWith('/orders/')) return 'Order Detail'
    return map[location.pathname] || ''
  })()

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="app-root">
      {/* Overlay */}
      {sideOpen && <div className="overlay" onClick={() => setSideOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sideOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Factory size={22} strokeWidth={2.25} /></div>
          <div>
            <div className="brand-name">AMOGA</div>
            <div className="brand-sub">FABRIC RECONCILIATION</div>
          </div>
          <button className="sidebar-close" onClick={() => setSideOpen(false)}><X size={18} /></button>
        </div>
        <nav className="nav">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSideOpen(false)}
            >
              <Icon size={18} strokeWidth={2} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">
          <div className="dept-tag">FABRIC DEPT</div>
          <div className="version">v1.0</div>
        </div>
      </aside>

      {/* Main area */}
      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSideOpen(true)}><MenuIcon size={22} /></button>
          <div className="topbar-title">{pageTitle}</div>
          <div className="topbar-date">{todayStr}</div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(({ to, label, Icon, primary }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            className={({ isActive }) => `bn-btn ${isActive ? 'active' : ''} ${primary ? 'primary' : ''}`}
          >
            <Icon size={primary ? 26 : 22} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <Toast {...toast} />
    </div>
  )
}
