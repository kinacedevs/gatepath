import { useState } from 'react'
import { leads as initialLeads } from '../data/mockData'

type Stage = 'new' | 'qualifying' | 'won' | 'lost'
const stages: { id: Stage; label: string; color: string; bg: string }[] = [
  { id: 'new', label: 'New Inquiry', color: '#0B7FC7', bg: '#EFF6FF' },
  { id: 'qualifying', label: 'Qualifying', color: '#D97706', bg: '#FFFBEB' },
  { id: 'won', label: 'Won', color: '#059669', bg: '#ECFDF5' },
  { id: 'lost', label: 'Lost', color: '#9B8E82', bg: '#F5F0EB' },
]

export default function Leads() {
  const [leadsData, setLeadsData] = useState(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<Stage | null>(null)

  const move = (id: string, stage: Stage) => {
    setLeadsData(prev => prev.map(l => l.id === id ? { ...l, stage } : l))
  }

  return (
    <div style={{ padding: '32px 40px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Leads</h1>
        <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
          Drag cards between columns to advance a lead through your pipeline.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, flex: 1, minHeight: 0 }}>
        {stages.map(stage => {
          const stageLeads = leadsData.filter(l => l.stage === stage.id)
          const isOver = over === stage.id
          return (
            <div
              key={stage.id}
              onDragOver={e => { e.preventDefault(); setOver(stage.id) }}
              onDrop={e => {
                e.preventDefault()
                if (dragging) move(dragging, stage.id)
                setDragging(null); setOver(null)
              }}
              onDragLeave={() => setOver(null)}
              style={{
                background: isOver ? stage.bg : '#FAFAF8',
                border: `1.5px dashed`,
                borderColor: isOver ? stage.color : '#E8E3DC',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'all 0.15s ease',
                minHeight: 400,
              }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }}/>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stage.label}</span>
                </div>
                <span style={{
                  background: stage.bg, color: stage.color,
                  border: `1px solid ${stage.color}30`,
                  borderRadius: 999, padding: '1px 8px',
                  fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
                }}>{stageLeads.length}</span>
              </div>

              {/* Cards */}
              {stageLeads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragging(lead.id)}
                  onDragEnd={() => { setDragging(null); setOver(null) }}
                  className="kanban-card"
                  style={{
                    background: '#fff',
                    border: '1px solid #E8E3DC',
                    borderRadius: 10,
                    padding: '14px 16px',
                    cursor: 'grab',
                    opacity: dragging === lead.id ? 0.5 : 1,
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{lead.name}</div>
                    {lead.diaspora && (
                      <span style={{
                        background: '#EFF6FF', color: '#0B7FC7', border: '1px solid #BFDBFE',
                        borderRadius: 999, padding: '1px 6px', fontSize: 9,
                        fontWeight: 700, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                      }}>Diaspora</span>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: '#6B5E53', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                    {lead.project} · {lead.plot}
                  </div>

                  {lead.siteVisit && (
                    <div style={{
                      background: '#EFF6FF', borderRadius: 6, padding: '5px 8px',
                      fontSize: 11, color: '#0B7FC7', fontWeight: 600,
                      fontFamily: "'Inter', sans-serif", marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span>📍</span> Site visit booked
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, color: '#9B8E82', fontFamily: "'Inter', sans-serif" }}>
                      via {lead.source}
                    </div>
                    <div style={{ fontSize: 10, color: '#9B8E82', fontFamily: "'Inter', sans-serif" }}>
                      {lead.agent.split(' ')[0]}
                    </div>
                  </div>

                  {stage.id !== 'won' && stage.id !== 'lost' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <ActionBtn label="📞 Call" />
                      <ActionBtn label="✉ Email" />
                      {stage.id === 'qualifying' && !lead.siteVisit && <ActionBtn label="🗓 Book visit" accent />}
                    </div>
                  )}
                </div>
              ))}

              {stageLeads.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#C4B8AB', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                  Drop leads here
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionBtn({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <button style={{
      background: accent ? '#E8A020' : '#F5F0EB',
      color: accent ? '#fff' : '#4a4a4a',
      border: 'none', borderRadius: 5,
      padding: '4px 10px', fontSize: 10, fontWeight: 600,
      cursor: 'pointer', fontFamily: "'Inter', sans-serif",
    }}>{label}</button>
  )
}
