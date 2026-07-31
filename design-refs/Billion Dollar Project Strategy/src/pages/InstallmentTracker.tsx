import { installments, formatKES } from '../data/mockData'

const totalOwed = installments.reduce((s, i) => s + i.totalPrice, 0)
const totalPaid = installments.reduce((s, i) => s + i.paid, 0)
const collectionRate = Math.round((totalPaid / totalOwed) * 100)

export default function InstallmentTracker() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 1050 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Installment Tracker</h1>
        <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Active payment plans across all clients.</div>
      </div>

      {/* Collection rate hero */}
      <div style={{
        background: '#074B7D', borderRadius: 16, padding: '32px 40px',
        marginBottom: 28, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 32, alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
            Portfolio Collection Rate
          </div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: 56, color: '#E8A020', lineHeight: 1 }}>
            {collectionRate}%
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8, fontFamily: "'Inter', sans-serif" }}>
            of total contracted value received
          </div>
          <div style={{ marginTop: 16, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${collectionRate}%`, background: '#E8A020', borderRadius: 3 }}/>
          </div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '0 32px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Total Received</div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 26, color: '#fff' }}>{formatKES(totalPaid)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Outstanding Balance</div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 26, color: '#FCA5A5' }}>{formatKES(totalOwed - totalPaid)}</div>
        </div>
      </div>

      {/* Installment table */}
      <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FAFAF8' }}>
              {['Client', 'Plot', 'Total Price', 'Paid', 'Remaining', 'Progress', 'Next Due', 'Status', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 20px', textAlign: 'left',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#9B8E82', fontFamily: "'Inter', sans-serif",
                  borderBottom: '1px solid #E8E3DC',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {installments.map((inst, i) => {
              const pct = Math.round((inst.paid / inst.totalPrice) * 100)
              const isOverdue = inst.status === 'overdue'
              return (
                <tr key={inst.id} style={{
                  borderBottom: i < installments.length - 1 ? '1px solid #F0EBE4' : 'none',
                  background: isOverdue ? '#FFFBF5' : 'transparent',
                }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{inst.client}</div>
                    <div style={{ fontSize: 11, color: '#9B8E82' }}>{inst.project}</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: '#4a4a4a', fontFamily: "'Inter', sans-serif" }}>{inst.plot}</td>
                  <td style={{ padding: '16px 20px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{formatKES(inst.totalPrice)}</td>
                  <td style={{ padding: '16px 20px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 13, color: '#065F46' }}>{formatKES(inst.paid)}</td>
                  <td style={{ padding: '16px 20px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 13, color: isOverdue ? '#DC2626' : '#1a1a1a' }}>{formatKES(inst.remaining)}</td>
                  <td style={{ padding: '16px 20px', minWidth: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: '#F0EBE4', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#059669' : pct >= 50 ? '#0B7FC7' : '#E8A020', borderRadius: 3 }}/>
                      </div>
                      <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 11, color: '#1a1a1a', flexShrink: 0 }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: isOverdue ? '#DC2626' : '#4a4a4a', fontFamily: "'Inter', sans-serif", fontWeight: isOverdue ? 600 : 400 }}>
                    {inst.nextDue}
                    {isOverdue && <div style={{ fontSize: 10, color: '#DC2626' }}>{inst.overdueDays}d late</div>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      background: isOverdue ? '#FEE2E2' : '#D1FAE5',
                      color: isOverdue ? '#DC2626' : '#065F46',
                      borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700,
                      fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                    }}>{isOverdue ? 'Overdue' : 'Current'}</span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {isOverdue && (
                      <button style={{
                        background: '#E8A020', color: '#fff', border: 'none', borderRadius: 7,
                        padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                      }}>Nudge →</button>
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
