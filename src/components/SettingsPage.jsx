import React from 'react'
import { supabase } from '../lib/supabase'
import { LOSS_LIMIT_PERCENT, DELAY_DAYS } from '../lib/constants'
import { STAFF } from '../lib/staff'
import { isAdmin } from '../lib/utils'

export default function SettingsPage({ userEmail, onLogout }) {
  const currentUser = STAFF.find(s => s.email === userEmail)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">Settings</h2>
        <div className="setting-row">
          <div>
            <div className="setting-label">Logged In As</div>
            <div className="setting-help">{currentUser?.name || userEmail}{isAdmin(userEmail) ? ' (Admin — can unlock entries)' : ''}</div>
          </div>
          <button className="btn-danger" onClick={handleLogout}>Logout</button>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Entry Locking</div>
            <div className="setting-help">Entries saved by Fabric Manager or Reconciliation are locked automatically. Only Admin can unlock them for correction.</div>
          </div>
          <div className="mono strong">ON</div>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Loss % Threshold</div>
            <div className="setting-help">Orders exceeding this loss on any process turn RED.</div>
          </div>
          <div className="mono strong">{LOSS_LIMIT_PERCENT}%</div>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Pending Delay Threshold</div>
            <div className="setting-help">Days waiting at any process before a job is flagged YELLOW.</div>
          </div>
          <div className="mono strong">{DELAY_DAYS} days</div>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Version</div>
            <div className="setting-help">Yarn Stock → Knitting Batches → Orders pipeline</div>
          </div>
          <div className="mono" style={{ color: 'var(--ink-60)' }}>v2.0</div>
        </div>
      </div>
    </div>
  )
}
