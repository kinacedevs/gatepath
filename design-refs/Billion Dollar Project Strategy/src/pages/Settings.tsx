import { useState } from 'react'

const notifOptions = [
  { id: 'overdue', label: 'Overdue installment payments', defaultOn: true },
  { id: 'newlead', label: 'New lead assigned to me', defaultOn: true },
  { id: 'deposited', label: 'Client pays a deposit', defaultOn: true },
  { id: 'visitbooked', label: 'Site visit booked', defaultOn: false },
  { id: 'approved', label: 'Inquiry approved or rejected', defaultOn: true },
  { id: 'signed', label: 'Agreement signed', defaultOn: true },
]

export default function Settings() {
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifOptions.map(n => [n.id, n.defaultOn]))
  )
  const [saved, setSaved] = useState(false)
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Settings</h1>
        <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Profile, notifications, and data exports.</div>
      </div>

      {/* Profile */}
      <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 20px', fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: '#1a1a1a' }}>My Profile</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Full name', value: 'Joseph Mwangi' },
            { label: 'Role', value: 'CEO (read-only)' },
            { label: 'Email', value: 'joseph@gatepathrealtors.co.ke' },
            { label: 'Phone', value: '+254 722 000 001' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>{f.label}</label>
              <input defaultValue={f.value} disabled={f.label === 'Role'} style={{
                width: '100%', background: f.label === 'Role' ? '#FAFAF8' : '#fff',
                border: '1px solid #E8E3DC', borderRadius: 7, padding: '9px 14px',
                fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif", outline: 'none',
                boxSizing: 'border-box',
              }} />
            </div>
          ))}
        </div>
        <button onClick={save} style={{
          marginTop: 20, background: saved ? '#059669' : '#0B7FC7', color: '#fff',
          border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'background 0.2s',
        }}>{saved ? '✓ Saved' : 'Save Profile'}</button>
      </div>

      {/* Notifications */}
      <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 20px', fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: '#1a1a1a' }}>Notifications</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {notifOptions.map(opt => (
            <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #F0EBE4' }}>
              <span style={{ fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{opt.label}</span>
              <button
                onClick={() => setNotifs(n => ({ ...n, [opt.id]: !n[opt.id] }))}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: notifs[opt.id] ? '#0B7FC7' : '#E8E3DC',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: notifs[opt.id] ? 22 : 3,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data export */}
      <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, padding: '24px 28px' }}>
        <h2 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: '#1a1a1a' }}>Data Export</h2>
        <div style={{ fontSize: 13, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
          Download a CSV or PDF snapshot of any dataset for reports or audits.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['All Contacts', 'All Deals', 'Installment Schedule', 'Plot Inventory', 'Lead Pipeline'].map(e => (
            <button key={e} style={{
              background: '#F5F0EB', border: '1px solid #E8E3DC', borderRadius: 7,
              padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: '#4a4a4a', fontFamily: "'Inter', sans-serif",
            }}>⬇ {e}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
