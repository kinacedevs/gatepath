import { agents, formatKES } from '../data/mockData'

const sorted = [...agents].sort((a, b) => b.conversionRate - a.conversionRate)

export default function AgentPerformance() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <PageHeader title="Agent Performance" sub="Ranked by conversion rate · Current quarter" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 36 }}>
        {sorted.map((agent, rank) => {
          const bar = (val: number, max: number, color: string) => (
            <div style={{ height: 4, background: '#F0EBE4', borderRadius: 2, flex: 1 }}>
              <div style={{ height: '100%', width: `${Math.min(100, (val / max) * 100)}%`, background: color, borderRadius: 2 }}/>
            </div>
          )

          return (
            <div key={agent.id} style={{
              background: '#fff',
              border: '1px solid',
              borderColor: rank === 0 ? '#E8A020' : '#E8E3DC',
              borderRadius: 14,
              padding: '24px 28px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {rank === 0 && (
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  background: '#FDF3E0', border: '1px solid #E8A020',
                  borderRadius: 999, padding: '2px 10px',
                  fontSize: 10, fontWeight: 700, color: '#C88A18',
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>Top Performer</div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: rank === 0 ? '#074B7D' : '#F0EBE4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14,
                  color: rank === 0 ? '#E8A020' : '#6B5E53',
                }}>
                  {agent.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{agent.name}</div>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 22, color: rank === 0 ? '#0B7FC7' : '#1a1a1a', lineHeight: 1.1 }}>
                    {agent.conversionRate}%
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#9B8E82', marginLeft: 6 }}>conversion</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Metric label="Leads assigned" value={agent.leadsAssigned} max={25} color="#0B7FC7" bar={bar} />
                <Metric label="Contacted" value={agent.contacted} max={25} color="#0B7FC7" bar={bar} />
                <Metric label="Site visits done" value={agent.siteVisits} max={15} color="#E8A020" bar={bar} />
                <Metric label="Deposits received" value={agent.depositsReceived} max={10} color="#E8A020" bar={bar} />
                <Metric label="Deals closed" value={agent.closed} max={10} color="#059669" bar={bar} />
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F0EBE4' }}>
                <div style={{ fontSize: 11, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginBottom: 2 }}>Revenue generated</div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 20, color: '#065F46' }}>
                  {formatKES(agent.revenue)}
                </div>
              </div>

              {/* Stale leads warning */}
              {agent.conversionRate < 12 && (
                <div style={{
                  marginTop: 12, background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 8, padding: '8px 12px',
                  fontSize: 11, color: '#DC2626', fontFamily: "'Inter', sans-serif",
                }}>
                  ⚠ {agent.leadsAssigned - agent.contacted} leads uncontacted — follow-up needed
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Funnel table */}
      <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8E3DC' }}>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>Pipeline Funnel</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FAFAF8' }}>
              {['Agent', 'Assigned', 'Contacted', 'Visits', 'Deposits', 'Closed', 'Revenue', 'Rate'].map(h => (
                <th key={h} style={{
                  padding: '10px 20px', textAlign: h === 'Agent' ? 'left' : 'center',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#9B8E82', fontFamily: "'Inter', sans-serif",
                  borderBottom: '1px solid #E8E3DC',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: i < sorted.length - 1 ? '1px solid #F0EBE4' : 'none' }}>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', background: '#F0EBE4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#6B5E53', fontFamily: "'Montserrat', sans-serif",
                    }}>{a.avatar}</div>
                    <span style={{ fontWeight: 600, fontSize: 13, fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>{a.name}</span>
                  </div>
                </td>
                {[a.leadsAssigned, a.contacted, a.siteVisits, a.depositsReceived, a.closed].map((v, j) => (
                  <td key={j} style={{ padding: '14px 20px', textAlign: 'center', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{v}</td>
                ))}
                <td style={{ padding: '14px 20px', textAlign: 'center', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 12, color: '#065F46' }}>{formatKES(a.revenue)}</td>
                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                  <span style={{
                    background: a.conversionRate >= 30 ? '#D1FAE5' : a.conversionRate >= 15 ? '#FEF3C7' : '#FEE2E2',
                    color: a.conversionRate >= 30 ? '#065F46' : a.conversionRate >= 15 ? '#92400E' : '#DC2626',
                    padding: '3px 10px', borderRadius: 999,
                    fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
                  }}>{a.conversionRate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Metric({ label, value, max, color, bar }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 80, fontSize: 11, color: '#9B8E82', fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>{label}</div>
      {bar(value, max, color)}
      <div style={{ width: 24, textAlign: 'right', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 12, color: '#1a1a1a' }}>{value}</div>
    </div>
  )
}

function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>{title}</h1>
      <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>{sub}</div>
    </div>
  )
}
