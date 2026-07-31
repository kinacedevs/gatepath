import { installments, projects, siteVisits, formatKES } from '../data/mockData'

const overdue = installments.filter(i => i.status === 'overdue')
const todayVisits = siteVisits.filter(v => v.date === '2025-07-31')
const totalInventoryValue = projects.reduce((s, p) => s + p.available * 1_950_000, 0)
const revenueThisMonth = 8_750_000

const StatCard = ({ label, value, sub, accent, warn }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }) => (
  <div style={{
    background: accent ? '#074B7D' : '#fff',
    border: '1px solid',
    borderColor: warn ? '#FCA5A5' : accent ? 'transparent' : '#E8E3DC',
    borderRadius: 12,
    padding: '24px 28px',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {accent && (
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(232,160,32,0.15)',
      }}/>
    )}
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: accent ? 'rgba(255,255,255,0.5)' : warn ? '#DC2626' : '#9B8E82',
      fontFamily: "'Inter', sans-serif",
      marginBottom: 8,
    }}>{label}</div>
    <div style={{
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 800,
      fontSize: 28,
      color: accent ? '#E8A020' : warn ? '#DC2626' : '#1a1a1a',
      lineHeight: 1,
    }}>{value}</div>
    {sub && (
      <div style={{ fontSize: 12, color: accent ? 'rgba(255,255,255,0.45)' : '#9B8E82', marginTop: 6, fontFamily: "'Inter', sans-serif" }}>{sub}</div>
    )}
  </div>
)

export default function Dashboard({ navigate }: { navigate: (p: any) => void }) {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
          Good morning, Joseph.
        </div>
        <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
          Thursday, 31 July 2025 · Here's what needs your attention today.
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
        <StatCard label="Revenue This Month" value="KES 8.75M" sub="↑ 18% vs. June" accent />
        <StatCard label="Site Visits Today" value={String(todayVisits.length)} sub={`${todayVisits.filter(v => v.status === 'confirmed').length} confirmed`} />
        <StatCard label="Available Inventory" value={String(projects.reduce((s, p) => s + p.available, 0))} sub={`${formatKES(totalInventoryValue)} unsold value`} />
        <StatCard label="Overdue Installments" value={String(overdue.length)} sub="Clients behind on payment" warn />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Overdue installments */}
        <div>
          <SectionHeader title="Overdue Installments" action="View all" onAction={() => navigate('installments')} />
          <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFAF8' }}>
                  {['Client', 'Plot', 'Overdue by', 'Outstanding', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: '#9B8E82', fontFamily: "'Inter', sans-serif",
                      borderBottom: '1px solid #E8E3DC',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdue.map((inst, i) => (
                  <tr key={inst.id} style={{ borderBottom: i < overdue.length - 1 ? '1px solid #F0EBE4' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{inst.client}</div>
                      <div style={{ fontSize: 11, color: '#9B8E82' }}>{inst.project}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#4a4a4a', fontFamily: "'Inter', sans-serif" }}>{inst.plot}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        background: inst.overdueDays > 10 ? '#FEE2E2' : '#FEF3C7',
                        color: inst.overdueDays > 10 ? '#DC2626' : '#92400E',
                        padding: '3px 10px', borderRadius: 999,
                        fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
                      }}>{inst.overdueDays}d late</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>
                      {formatKES(inst.remaining)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button style={{
                        background: '#E8A020', color: '#fff', border: 'none', borderRadius: 6,
                        padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                      }}>Nudge</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Today's site visits */}
          <div>
            <SectionHeader title="Today's Visits" action="All visits" onAction={() => navigate('visits')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayVisits.map(v => (
                <div key={v.id} style={{
                  background: '#fff', border: '1px solid #E8E3DC', borderRadius: 10,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: v.type === 'virtual' ? '#EFF6FF' : '#F0FDF4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>{v.type === 'virtual' ? '📹' : '🚗'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{v.clientName}</div>
                    <div style={{ fontSize: 11, color: '#9B8E82' }}>{v.time} · {v.project}</div>
                  </div>
                  <span style={{
                    background: v.status === 'confirmed' ? '#D1FAE5' : '#FEF3C7',
                    color: v.status === 'confirmed' ? '#065F46' : '#92400E',
                    padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{v.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project inventory snapshot */}
          <div>
            <SectionHeader title="Inventory Snapshot" action="Full inventory" onAction={() => navigate('inventory')} />
            <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 12, overflow: 'hidden' }}>
              {projects.map((p, i) => {
                const pct = Math.round((p.sold / p.totalPlots) * 100)
                return (
                  <div key={p.id} style={{
                    padding: '12px 16px',
                    borderBottom: i < projects.length - 1 ? '1px solid #F0EBE4' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{p.name}</div>
                      <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 700, color: '#0B7FC7' }}>{pct}%</div>
                    </div>
                    <div style={{ height: 4, background: '#F0EBE4', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#0B7FC7', borderRadius: 2, transition: 'width 0.6s ease' }}/>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                      <Pill color="#D1FAE5" text={`${p.sold} sold`} textColor="#065F46" />
                      <Pill color="#FEF3C7" text={`${p.booked} booked`} textColor="#92400E" />
                      <Pill color="#F0EBE4" text={`${p.available} avail`} textColor="#6B5E53" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: '#1a1a1a' }}>{title}</h2>
      <button onClick={onAction} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 12, color: '#0B7FC7', fontWeight: 500, fontFamily: "'Inter', sans-serif",
      }}>{action} →</button>
    </div>
  )
}

function Pill({ color, text, textColor }: { color: string; text: string; textColor: string }) {
  return <span style={{ background: color, color: textColor, padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{text}</span>
}
