import { useState } from 'react'
import { inquiries as initialInquiries, formatKES } from '../data/mockData'

export default function InquiriesQueue() {
  const [inquiries, setInquiries] = useState(initialInquiries)
  const [selected, setSelected] = useState<string | null>(inquiries[0].id)

  const current = inquiries.find(i => i.id === selected)

  const approve = (id: string) => setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: 'approved' } : i))

  const signOffer = (id: string) => setInquiries(prev => prev.map(i => i.id === id ? { ...i, offerLetterSigned: true } : i))
  const signAgreement = (id: string) => setInquiries(prev => prev.map(i => i.id === id ? { ...i, agreementSigned: true } : i))

  return (
    <div style={{ padding: '32px 40px', display: 'flex', gap: 24, height: '100%', minHeight: 0 }}>
      {/* Sidebar list */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Inquiries Queue</h1>
          <div style={{ fontSize: 12, color: '#9B8E82', marginTop: 2, fontFamily: "'Inter', sans-serif" }}>Review buyers before legal steps.</div>
        </div>
        {inquiries.map(inq => (
          <button
            key={inq.id}
            onClick={() => setSelected(inq.id)}
            style={{
              background: selected === inq.id ? '#074B7D' : '#fff',
              border: '1px solid',
              borderColor: selected === inq.id ? '#074B7D' : '#E8E3DC',
              borderRadius: 10, padding: '12px 16px',
              textAlign: 'left', cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: selected === inq.id ? '#fff' : '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>
                {inq.name}
              </div>
              <StatusDot status={inq.status} />
            </div>
            <div style={{ fontSize: 11, color: selected === inq.id ? 'rgba(255,255,255,0.55)' : '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 3 }}>
              {inq.plot} · {inq.project}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {inq.depositPaid && <Dot color="#0B7FC7" label="Deposit paid" />}
              {inq.fullyPaid && <Dot color="#059669" label="Fully paid" />}
              {inq.offerLetterSigned && <Dot color="#E8A020" label="Offer signed" />}
              {inq.agreementSigned && <Dot color="#059669" label="Agreement signed" />}
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {current && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              background: '#074B7D', padding: '24px 32px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{current.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', sans-serif", marginTop: 4 }}>
                  {current.location}{current.diaspora ? ' · Diaspora buyer' : ''} · Submitted {current.submittedDate}
                </div>
              </div>
              {current.status === 'pending' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => approve(current.id)} style={{
                    background: '#059669', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}>Approve</button>
                  <button style={{
                    background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}>Reject</button>
                </div>
              )}
              {current.status === 'approved' && (
                <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 999, padding: '6px 16px', fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                  ✓ Approved
                </span>
              )}
            </div>

            <div style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              {/* Personal details */}
              <Section title="Personal Details">
                <Field label="Full name" value={current.name} />
                <Field label="National ID" value={current.idNumber} />
                <Field label="Date of birth" value={current.dob} />
                <Field label="Occupation" value={current.occupation} />
                <Field label="Phone" value={current.phone} />
                <Field label="Email" value={current.email} />
              </Section>

              {/* Next of kin */}
              <Section title="Next of Kin">
                <Field label="Name" value={current.nextOfKin} />
                <Field label="Relationship" value={current.nokRelation} />
                <Field label="Phone" value={current.nokPhone} />
              </Section>

              {/* Plot */}
              <Section title="Plot Details">
                <Field label="Project" value={current.project} />
                <Field label="Plot number" value={current.plot} />
                <Field label="Sale price" value={formatKES(current.price)} mono />
                <Field label="Deposit paid" value={current.depositPaid ? formatKES(current.depositAmount) : 'Not yet paid'} mono />
                <Field label="Fully paid" value={current.fullyPaid ? 'Yes — ' + formatKES(current.price) : 'No'} />
              </Section>

              {/* Document gate — the most important section */}
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>
                  Legal Documents
                </div>

                {/* Offer Letter */}
                <DocGate
                  title="Offer Letter"
                  subtitle="Issued upon first deposit. Provisional — not a binding sale agreement."
                  gateLabel="Requires: Deposit paid"
                  unlocked={current.depositPaid}
                  signed={current.offerLetterSigned}
                  onSign={() => signOffer(current.id)}
                  signLabel="Sign Offer Letter"
                  lockedReason="This letter cannot be issued until a deposit is received."
                  docType="offer"
                />

                {/* Agreement */}
                <DocGate
                  title="Sale Agreement"
                  subtitle="Binding legal document. Only valid once fully paid. CEO signature required."
                  gateLabel="Requires: Full payment received"
                  unlocked={current.fullyPaid}
                  signed={current.agreementSigned}
                  onSign={() => signAgreement(current.id)}
                  signLabel="Sign Agreement as CEO"
                  lockedReason="The Agreement is NOT signable until the client has paid in full. Do not present this document as valid before that point."
                  docType="agreement"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocGate({ title, subtitle, gateLabel, unlocked, signed, onSign, signLabel, lockedReason, docType }: {
  title: string; subtitle: string; gateLabel: string; unlocked: boolean; signed: boolean;
  onSign: () => void; signLabel: string; lockedReason: string; docType: string;
}) {
  return (
    <div style={{
      border: '2px solid',
      borderColor: signed ? '#059669' : unlocked ? '#E8A020' : '#E8E3DC',
      borderRadius: 12, padding: '16px 20px', marginBottom: 16,
      background: signed ? '#F0FDF4' : unlocked ? '#FFFBF0' : '#FAFAF8',
      position: 'relative',
      transition: 'all 0.2s ease',
    }}
    className={unlocked && !signed ? 'doc-ready' : ''}>
      {/* Lock icon */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        width: 32, height: 32, borderRadius: '50%',
        background: signed ? '#059669' : unlocked ? '#E8A020' : '#E8E3DC',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>
        {signed ? '✓' : unlocked ? '🔓' : '🔒'}
      </div>

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: '#6B5E53', fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
        {subtitle}
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: unlocked ? '#FDF3E0' : '#F0EBE4',
        border: `1px solid ${unlocked ? '#E8A020' : '#E0D8CF'}`,
        borderRadius: 999, padding: '2px 10px',
        fontSize: 10, fontWeight: 700, color: unlocked ? '#C88A18' : '#9B8E82',
        fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 10,
      }}>
        {unlocked ? '✓' : '○'} {gateLabel}
      </div>

      {!unlocked && (
        <div style={{
          fontSize: 11, color: '#DC2626', fontFamily: "'Inter', sans-serif",
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px',
        }}>
          {lockedReason}
        </div>
      )}

      {unlocked && !signed && (
        <button onClick={onSign} style={{
          background: docType === 'agreement' ? '#074B7D' : '#E8A020',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", display: 'block', width: '100%', marginTop: 4,
        }}>
          ✍️ {signLabel}
        </button>
      )}

      {signed && (
        <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
          Signed by Joseph Mwangi · CEO
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8, borderBottom: '1px solid #F0EBE4' }}>
      <span style={{ fontSize: 11, color: '#9B8E82', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1a1a', fontFamily: mono ? "'Montserrat', sans-serif" : "'Inter', sans-serif", fontWeight: mono ? 600 : 500 }}>{value}</span>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { approved: '#059669', pending: '#D97706', rejected: '#DC2626' }
  return (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status] || '#9B8E82', display: 'inline-block', flexShrink: 0, marginTop: 3 }}/>
  )
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      background: color + '20', color, border: `1px solid ${color}40`,
      borderRadius: 999, padding: '1px 6px', fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif",
    }}>{label}</span>
  )
}
