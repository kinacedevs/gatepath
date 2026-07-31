import { useState } from 'react'
import { staff as initialStaff } from '../data/mockData'

const roleColors: Record<string, { bg: string; color: string }> = {
  CEO: { bg: '#074B7D', color: '#E8A020' },
  Manager: { bg: '#EFF6FF', color: '#0B7FC7' },
  Agent: { bg: '#F5F0EB', color: '#6B5E53' },
}

export default function StaffAccounts() {
  const [staff, setStaff] = useState(initialStaff)

  const toggle = (id: string) => setStaff(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s))

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Staff Accounts</h1>
          <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Control who can access this system and at what level.</div>
        </div>
        <button style={{
          background: '#0B7FC7', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
        }}>+ Invite Staff</button>
      </div>

      {/* Access level note */}
      <div style={{
        background: '#FDF3E0', border: '1px solid #E8A020', borderRadius: 10,
        padding: '12px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <span>🔏</span>
        <div style={{ fontSize: 12, color: '#92400E', fontFamily: "'Inter', sans-serif" }}>
          <strong>Only Joseph Mwangi (CEO)</strong> can sign legal documents. This permission cannot be delegated via this interface.
        </div>
      </div>

      {/* Staff list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {staff.map(member => {
          const rc = roleColors[member.role] || roleColors.Agent
          const isActive = member.status === 'active'
          return (
            <div key={member.id} style={{
              background: '#fff', border: '1px solid',
              borderColor: isActive ? '#E8E3DC' : '#F0EBE4',
              borderRadius: 12, padding: '18px 24px',
              display: 'flex', alignItems: 'center', gap: 18,
              opacity: isActive ? 1 : 0.6,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: rc.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14,
                color: rc.color,
              }}>{member.avatar}</div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{member.name}</span>
                  {member.canSign && (
                    <span style={{
                      background: '#FDF3E0', color: '#C88A18', border: '1px solid #E8A020',
                      borderRadius: 999, padding: '1px 8px', fontSize: 9, fontWeight: 700,
                      fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>Can sign</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                  {member.email} · Joined {member.joined}
                </div>
              </div>

              <span style={{
                background: rc.bg, color: rc.color, borderRadius: 999,
                padding: '4px 14px', fontSize: 11, fontWeight: 700,
                fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{member.role}</span>

              <span style={{
                background: isActive ? '#D1FAE5' : '#F5F0EB',
                color: isActive ? '#065F46' : '#9B8E82',
                borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
              }}>{isActive ? 'Active' : 'Inactive'}</span>

              {member.role !== 'CEO' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{
                    background: '#F5F0EB', border: '1px solid #E8E3DC', borderRadius: 7,
                    padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    color: '#4a4a4a', fontFamily: "'Inter', sans-serif",
                  }}>Change role</button>
                  <button
                    onClick={() => toggle(member.id)}
                    style={{
                      background: isActive ? '#FEE2E2' : '#D1FAE5',
                      border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 11,
                      fontWeight: 600, cursor: 'pointer',
                      color: isActive ? '#DC2626' : '#065F46', fontFamily: "'Inter', sans-serif",
                    }}>
                    {isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
