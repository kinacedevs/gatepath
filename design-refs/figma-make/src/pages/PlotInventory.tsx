import { useState } from 'react'
import { plots, projects, formatKES } from '../data/mockData'

type Status = 'all' | 'available' | 'booked' | 'sold'

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  available: { bg: '#D1FAE5', color: '#065F46', label: 'Available' },
  booked: { bg: '#FEF3C7', color: '#92400E', label: 'Booked' },
  sold: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Sold' },
}

export default function PlotInventory() {
  const [filter, setFilter] = useState<Status>('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [verifying, setVerifying] = useState<string | null>(null)
  const [verified, setVerified] = useState<string[]>([])

  const filtered = plots.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (projectFilter === 'all' || p.projectId === projectFilter)
  )

  const unverifiedSold = plots.filter(p => p.status === 'sold' && !p.titleVerified && !verified.includes(p.id))

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Plot Inventory</h1>
        <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Every plot across all projects. Title verification status is mandatory.</div>
      </div>

      {/* Project summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {projects.map(p => (
          <div key={p.id} style={{
            background: '#fff', border: '1px solid #E8E3DC', borderRadius: 12,
            padding: '16px 20px', cursor: 'pointer',
            borderBottom: projectFilter === p.id ? '3px solid #0B7FC7' : undefined,
          }} onClick={() => setProjectFilter(projectFilter === p.id ? 'all' : p.id)}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>{p.location}</div>
            <div style={{ height: 5, background: '#F0EBE4', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${Math.round((p.sold / p.totalPlots) * 100)}%`, background: '#0B7FC7', borderRadius: 2 }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: '#9B8E82', fontFamily: "'Inter', sans-serif" }}>{p.sold}/{p.totalPlots} sold</span>
              <span style={{ fontSize: 10, color: '#059669', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{p.available} left</span>
            </div>
          </div>
        ))}
      </div>

      {/* Unverified warning */}
      {unverifiedSold.length > 0 && (
        <div style={{
          background: '#FFF7ED', border: '2px solid #F59E0B', borderRadius: 10,
          padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 14,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: '#92400E', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
              {unverifiedSold.length} sold plot{unverifiedSold.length > 1 ? 's' : ''} without a logged title verification — this is a compliance gap.
            </div>
            <div style={{ fontSize: 12, color: '#B45309', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
              {unverifiedSold.map(p => p.number).join(', ')} · Use the "Log Verification" button on each plot to clear this.
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'available', 'booked', 'sold'] as Status[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: filter === s ? '#074B7D' : '#fff',
            color: filter === s ? '#fff' : '#6B5E53',
            border: '1px solid', borderColor: filter === s ? '#074B7D' : '#E8E3DC',
            borderRadius: 7, padding: '6px 16px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif',",
            textTransform: 'capitalize',
          }}>
            {s === 'all' ? `All (${plots.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${plots.filter(p => p.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Plot table */}
      <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FAFAF8' }}>
              {['Plot No.', 'Project', 'Size', 'Price', 'Status', 'Client', 'Title Verified', ''].map(h => (
                <th key={h} style={{
                  padding: '10px 18px', textAlign: 'left',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#9B8E82', fontFamily: "'Inter', sans-serif", borderBottom: '1px solid #E8E3DC',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((plot, i) => {
              const ss = statusStyle[plot.status]
              const isVerified = plot.titleVerified || verified.includes(plot.id)
              const proj = projects.find(p => p.id === plot.projectId)
              const needsVerify = plot.status === 'sold' && !isVerified

              return (
                <tr key={plot.id} style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid #F0EBE4' : 'none',
                  background: needsVerify ? '#FFFBF5' : 'transparent',
                }}>
                  <td style={{ padding: '14px 18px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 13, color: '#0B7FC7' }}>{plot.number}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: '#6B5E53', fontFamily: "'Inter', sans-serif" }}>{proj?.name}</td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{plot.size}</td>
                  <td style={{ padding: '14px 18px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{formatKES(plot.price)}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      background: ss.bg, color: ss.color, borderRadius: 999,
                      padding: '3px 10px', fontSize: 10, fontWeight: 700,
                      fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                    }}>{ss.label}</span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>
                    {plot.clientName ?? '—'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {plot.status === 'available' ? (
                      <span style={{ fontSize: 12, color: '#C4B8AB', fontFamily: "'Inter', sans-serif" }}>N/A</span>
                    ) : isVerified ? (
                      <div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>✓ Verified</div>
                        {plot.verifiedBy && <div style={{ fontSize: 10, color: '#9B8E82' }}>by {plot.verifiedBy} · {plot.verifiedDate}</div>}
                      </div>
                    ) : (
                      <span style={{
                        background: needsVerify ? '#FEF2F2' : '#FEF3C7',
                        color: needsVerify ? '#DC2626' : '#92400E',
                        borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif",
                      }}>{needsVerify ? '⚠ NOT VERIFIED' : 'Pending'}</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {(plot.status === 'sold' || plot.status === 'booked') && !isVerified && (
                      <button
                        onClick={() => setVerified(v => [...v, plot.id])}
                        style={{
                          background: needsVerify ? '#DC2626' : '#0B7FC7',
                          color: '#fff', border: 'none', borderRadius: 7,
                          padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        Log Verification
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
