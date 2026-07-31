import { useState } from 'react'
import { contacts, plots, formatKES } from '../data/mockData'

const unverifiedSold = plots.filter(p => p.status === 'sold' && !p.titleVerified)

export default function Contacts() {
  const [search, setSearch] = useState('')
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Contacts</h1>
          <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Every person who has engaged with Gatepath Realtors.</div>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts…"
          style={{
            background: '#fff', border: '1px solid #E8E3DC', borderRadius: 8,
            padding: '8px 14px', fontSize: 13, color: '#1a1a1a',
            fontFamily: "'Inter', sans-serif", width: 220, outline: 'none',
          }}
        />
      </div>

      {/* Title verification warning */}
      {unverifiedSold.length > 0 && (
        <div style={{
          background: '#FFF7ED', border: '1.5px solid #F59E0B',
          borderRadius: 10, padding: '14px 20px', marginBottom: 24,
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
              {unverifiedSold.length} sold plot{unverifiedSold.length > 1 ? 's' : ''} without a title verification on record
            </div>
            <div style={{ fontSize: 12, color: '#B45309', fontFamily: "'Inter', sans-serif" }}>
              {unverifiedSold.map(p => `${p.number} (${p.clientName})`).join(' · ')} — this is a compliance gap. Check Plot Inventory to log the verification.
            </div>
          </div>
        </div>
      )}

      {/* Contacts grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(contact => (
          <div key={contact.id} style={{
            background: '#fff', border: '1px solid #E8E3DC', borderRadius: 12,
            padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 18,
          }}>
            {/* Avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: contact.diaspora ? '#074B7D' : '#F0EBE4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14,
              color: contact.diaspora ? '#E8A020' : '#6B5E53',
            }}>
              {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>

            {/* Name + email */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{contact.name}</span>
                {contact.diaspora && (
                  <span style={{
                    background: '#EFF6FF', color: '#0B7FC7', borderRadius: 999,
                    padding: '1px 8px', fontSize: 10, fontWeight: 700,
                    fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                  }}>Diaspora · {contact.location}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                {contact.email} · {contact.location}
              </div>
              <div style={{ fontSize: 11, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 1 }}>
                Via {contact.source}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 22, color: '#0B7FC7', lineHeight: 1 }}>{contact.plots}</div>
                <div style={{ fontSize: 10, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>plots bought</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14, color: '#065F46', lineHeight: 1 }}>
                  {contact.totalValue > 0 ? formatKES(contact.totalValue) : '—'}
                </div>
                <div style={{ fontSize: 10, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>total invested</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <ContactBtn href={`tel:${contact.phone}`} label="📞 Call" />
              <ContactBtn href={`mailto:${contact.email}`} label="✉ Email" />
            </div>

            {/* Type badge */}
            <span style={{
              background: contact.type === 'buyer' ? '#D1FAE5' : '#FEF3C7',
              color: contact.type === 'buyer' ? '#065F46' : '#92400E',
              borderRadius: 999, padding: '3px 12px',
              fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{contact.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContactBtn({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{
      background: '#F5F0EB', color: '#4a4a4a', borderRadius: 7,
      padding: '7px 14px', fontSize: 12, fontWeight: 600,
      textDecoration: 'none', fontFamily: "'Inter', sans-serif",
      border: '1px solid #E8E3DC',
    }}>{label}</a>
  )
}
