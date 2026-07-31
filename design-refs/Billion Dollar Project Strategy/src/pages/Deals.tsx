import { deals, formatKES } from '../data/mockData'

const total = deals.reduce((s, d) => s + d.price, 0)

export default function Deals() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Closed Deals</h1>
        <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
          Fully paid · CEO-signed · Legally binding. This is the record that counts.
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <SumCard label="Total closed deals" value={String(deals.length)} />
        <SumCard label="Total value" value={formatKES(total)} />
        <SumCard label="This month" value="2" sub="KES 3.9M" accent />
      </div>

      {/* Authority note */}
      <div style={{
        background: '#074B7D', borderRadius: 12, padding: '16px 24px',
        marginBottom: 28, display: 'flex', gap: 16, alignItems: 'center',
      }}>
        <span style={{ fontSize: 22 }}>🔏</span>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 15, color: '#fff', marginBottom: 2 }}>
            CEO-signed agreements only
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif" }}>
            Every deal in this list has been verified as fully paid and personally signed by Joseph Mwangi. Nothing provisional appears here.
          </div>
        </div>
      </div>

      {/* Deals list */}
      <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, overflow: 'hidden' }}>
        {deals.map((deal, i) => (
          <div key={deal.id} style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
            alignItems: 'center', gap: 16,
            padding: '20px 28px',
            borderBottom: i < deals.length - 1 ? '1px solid #F0EBE4' : 'none',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', fontFamily: "'Playfair Display', serif" }}>{deal.client}</div>
              <div style={{ fontSize: 12, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                {deal.plot} · {deal.project}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 16, color: '#065F46' }}>
                {formatKES(deal.price)}
              </div>
              <div style={{ fontSize: 10, color: '#9B8E82', fontFamily: "'Inter', sans-serif" }}>full price paid</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>Signed {deal.signedDate}</div>
              <div style={{ fontSize: 11, color: '#9B8E82', fontFamily: "'Inter', sans-serif" }}>via {deal.agent}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                ✓ Paid in full
              </span>
            </div>
            <button style={{
              background: '#F5F0EB', border: '1px solid #E8E3DC', borderRadius: 7,
              padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: '#4a4a4a', fontFamily: "'Inter', sans-serif",
            }}>View Agreement</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SumCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? '#074B7D' : '#fff',
      border: '1px solid', borderColor: accent ? 'transparent' : '#E8E3DC',
      borderRadius: 12, padding: '20px 24px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent ? 'rgba(255,255,255,0.5)' : '#9B8E82', fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 24, color: accent ? '#E8A020' : '#1a1a1a' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>{sub}</div>}
    </div>
  )
}
