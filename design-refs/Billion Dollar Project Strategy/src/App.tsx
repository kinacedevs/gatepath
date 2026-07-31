import { useState, type ReactElement } from 'react'
import Dashboard from './pages/Dashboard'
import AgentPerformance from './pages/AgentPerformance'
import Leads from './pages/Leads'
import Contacts from './pages/Contacts'
import Deals from './pages/Deals'
import InstallmentTracker from './pages/InstallmentTracker'
import InquiriesQueue from './pages/InquiriesQueue'
import SiteVisits from './pages/SiteVisits'
import PlotInventory from './pages/PlotInventory'
import Campaigns from './pages/Campaigns'
import StaffAccounts from './pages/StaffAccounts'
import Settings from './pages/Settings'

type Page = 'dashboard' | 'agents' | 'leads' | 'contacts' | 'deals' | 'installments' | 'inquiries' | 'visits' | 'inventory' | 'campaigns' | 'staff' | 'settings'

const navItems: Array<{ id: Page; label: string; icon: string; group?: string }> = [
  { id: 'dashboard', label: 'Overview', icon: 'grid', group: 'Main' },
  { id: 'leads', label: 'Leads', icon: 'funnel', group: 'Sales' },
  { id: 'agents', label: 'Agent Performance', icon: 'bar-chart', group: 'Sales' },
  { id: 'contacts', label: 'Contacts', icon: 'users', group: 'Sales' },
  { id: 'deals', label: 'Closed Deals', icon: 'check-square', group: 'Sales' },
  { id: 'installments', label: 'Installments', icon: 'credit-card', group: 'Finance' },
  { id: 'inquiries', label: 'Inquiries Queue', icon: 'file-text', group: 'Finance' },
  { id: 'visits', label: 'Site Visits', icon: 'map-pin', group: 'Operations' },
  { id: 'inventory', label: 'Plot Inventory', icon: 'layers', group: 'Operations' },
  { id: 'campaigns', label: 'Campaigns & Content', icon: 'megaphone', group: 'Operations' },
  { id: 'staff', label: 'Staff Accounts', icon: 'shield', group: 'Admin' },
  { id: 'settings', label: 'Settings', icon: 'settings', group: 'Admin' },
]

const groups = ['Main', 'Sales', 'Finance', 'Operations', 'Admin']

const Icon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const s = size
  const icons: Record<string, ReactElement> = {
    grid: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    funnel: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    'bar-chart': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
    users: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    'check-square': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    'credit-card': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    'file-text': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    'map-pin': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    layers: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    megaphone: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
    shield: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    settings: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    bell: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  }
  return icons[name] ?? <svg width={s} height={s} viewBox="0 0 24 24"/>
}

export { Icon }

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  const pageComponents: Record<Page, ReactElement> = {
    dashboard: <Dashboard navigate={setPage} />,
    agents: <AgentPerformance />,
    leads: <Leads />,
    contacts: <Contacts />,
    deals: <Deals />,
    installments: <InstallmentTracker />,
    inquiries: <InquiriesQueue />,
    visits: <SiteVisits />,
    inventory: <PlotInventory />,
    campaigns: <Campaigns />,
    staff: <StaffAccounts />,
    settings: <Settings />,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8F4EE' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: '#074B7D',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HouseMark />
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.2 }}>Gatepath</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400, fontSize: 10, color: '#E8A020', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Realtors</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {groups.map(group => {
            const items = navItems.filter(i => i.group === group)
            return (
              <div key={group} style={{ marginBottom: 4 }}>
                <div style={{
                  padding: '10px 20px 4px',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {group}
                </div>
                {items.map(item => {
                  const active = page === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPage(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '8px 20px',
                        background: active ? 'rgba(11,127,199,0.25)' : 'transparent',
                        border: 'none',
                        borderLeft: active ? '3px solid #E8A020' : '3px solid transparent',
                        cursor: 'pointer',
                        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ opacity: active ? 1 : 0.7 }}>
                        <Icon name={item.icon} size={14} />
                      </span>
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#E8A020',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#074B7D', fontFamily: "'Montserrat', sans-serif",
            }}>JM</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" }}>Joseph Mwangi</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>CEO · Can sign</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {pageComponents[page]}
      </main>
    </div>
  )
}

function HouseMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 4L4 14v14h8v-8h8v8h8V14L16 4z" fill="#0B7FC7" opacity="0.9"/>
      <path d="M16 4L28 14" stroke="#E8A020" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 4L4 14" stroke="#E8A020" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="15" r="3" fill="#E8A020"/>
      <path d="M14 28v-5h4v5" fill="#074B7D"/>
    </svg>
  )
}
