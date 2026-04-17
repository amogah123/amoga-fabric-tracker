// Staff list for the login dropdown.
// These emails MUST match the users created in Supabase Auth.
// The "name" is what appears on the login screen — staff never see the emails.
//
// To add/change users:
// 1. Create or update users in Supabase → Authentication → Users
// 2. Update this list to match
// 3. Push the change to GitHub (auto-deploys in ~2 min)

export const STAFF = [
  { id: 'admin',  name: 'Admin',           email: 'admin@amoga.local' },
  { id: 'fabric', name: 'Fabric Manager',  email: 'fabric@amoga.local' },
  { id: 'recon',  name: 'Reconciliation',  email: 'recon@amoga.local' },
]
