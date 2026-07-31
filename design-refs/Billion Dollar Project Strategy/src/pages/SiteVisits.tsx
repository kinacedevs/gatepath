import { useState } from 'react'
import { siteVisits as initial } from '../data/mockData'

const statusColors: Record<string, { bg: string; color: string }> = {
  confirmed: { bg: '#D1FAE5', color: '#065F46' },
  pending: { bg: '#FEF3C7', color: '#92400E' },
  overdue: { bg: '#FEE2E2', color: '#DC2626' },
  completed: { bg: '#F0EBE4', color: '#6B5E53' },
}

export default function SiteVisits() {
  const [visits, setVisits] = useState(initial)

  const confirm = (id: string) => setVisits(prev => prev.map(v => v.id === id ? { ...v, status: 'confirmed' } : v))
  const complete = (id: string) => setVisits(prev => prev.map(v => v.id === id ? { ...v, status: 'completed' } : v))

  const overdueVisits = visits.filter(v => v.status === 'overdue')

  return (
    <div style={{ padding: '32px 40px', maxWidth: 980 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Site Visits</h1>
          <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Upcoming and past visits for all projects.</div>
        </div>
        <button style={{
          background: '#0B7FC7', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}>+ Schedule Visit</button>
      </div>

      {/* Overdue alert */}
      {overdueVisits.length > 0 && (
        <div style={{
          background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10,
          padding: '14px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#DC2626', fontFamily: "'Inter', sans-serif" }}>
              {overdueVisits.length} visit{overdueVisits.length > 1 ? 's' : ''} past their date with no confirmation — these clients may be lost to neglect.
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
              {overdueVisits.map(v => v.clientName).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total visits', value: visits.length, color: '#1a1a1a' },
          { label: 'Confirmed', value: visits.filter(v => v.status === 'confirmed').length, color: '#059669' },
          { label: 'Pending', value: visits.filter(v => v.status === 'pending').length, color: '#D97706' },
          { label: 'Overdue / unconfirmed', value: overdueVisits.length, color: '#DC2626' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid #E8E3DC', borderRadius: 10,
            padding: '14px 20px', flex: 1,
          }}>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 24, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Visits list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visits.map(visit => {
          const sc = statusColors[visit.status] || statusColors.pending
          return (
            <div key={visit.id} style={{
              background: '#fff', border: '1px solid',
              borderColor: visit.status === 'overdue' ? '#FECACA' : '#E8E3DC',
              borderRadius: 12, padding: '18px 24px',
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
              alignItems: 'center', gap: 16,
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: visit.type === 'virtual' ? '#EFF6FF' : '#F0FDF4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {visit.type === 'virtual' ? '📹' : '🚗'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{visit.clientName}</div>
                  <div style={{ fontSize: 12, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 1 }}>{visit.project}</div>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{visit.date}</div>
                <div style={{ fontSize: 12, color: '#9B8E82' }}>{visit.time}</div>
              </div>
              <div style={{ fontSize: 12, color: '#6B5E53', fontFamily: "'Inter', sans-serif" }}>
                Agent: {visit.agent.split(' ')[0]}
              </div>
              <span style={{
                background: sc.bg, color: sc.color,
                borderRadius: 999, padding: '4px 12px',
                fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.05em', alignSelf: 'center',
              }}>{visit.status}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {visit.status === 'pending' && (
                  <button onClick={() => confirm(visit.id)} style={{
                    background: '#0B7FC7', color: '#fff', border: 'none', borderRadius: 7,
                    padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}>Confirm</button>
                )}
                {visit.status === 'confirmed' && (
                  <button onClick={() => complete(visit.id)} style={{
                    background: '#059669', color: '#fff', border: 'none', borderRadius: 7,
                    padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}>Mark done</button>
                )}
                {visit.status === 'overdue' && (
                  <button style={{
                    background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 7,
                    padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}>Reschedule</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
