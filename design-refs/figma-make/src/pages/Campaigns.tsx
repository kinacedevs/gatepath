import { useState } from 'react'
import { projects } from '../data/mockData'

const referralPartners = [
  { name: 'Kenya Real Estate Network', referrals: 14, conversions: 8, value: '12.4M' },
  { name: 'Diaspora Connect Kenya', referrals: 9, conversions: 4, value: '7.1M' },
  { name: 'Ruiru Business Club', referrals: 6, conversions: 3, value: '5.6M' },
  { name: 'Online: Instagram Ads', referrals: 22, conversions: 7, value: '11.9M' },
]

const blogPosts = [
  { title: 'Why Ruiru Is the Smart Investment in 2025', date: '2025-07-14', published: true },
  { title: 'How to Buy Land as a Kenyan in the Diaspora', date: '2025-06-28', published: true },
  { title: 'Understanding Title Deeds in Kenya: A Plain Guide', date: '2025-05-30', published: false },
]

export default function Campaigns() {
  const [tab, setTab] = useState<'media' | 'blog' | 'referrals'>('media')
  const [selected, setSelected] = useState(projects[0].id)

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1050 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Campaigns & Content</h1>
        <div style={{ fontSize: 13, color: '#9B8E82', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Manage website content, blog posts, and referral partners without needing a developer.</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[['media', 'Project Media'], ['blog', 'Blog'], ['referrals', 'Referral Partners']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{
            background: tab === id ? '#074B7D' : '#fff',
            color: tab === id ? '#fff' : '#6B5E53',
            border: '1px solid', borderColor: tab === id ? '#074B7D' : '#E8E3DC',
            borderRadius: 7, padding: '8px 20px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}>{label}</button>
        ))}
      </div>

      {tab === 'media' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {projects.map(p => (
              <button key={p.id} onClick={() => setSelected(p.id)} style={{
                background: selected === p.id ? '#0B7FC7' : '#fff',
                color: selected === p.id ? '#fff' : '#4a4a4a',
                border: '1px solid', borderColor: selected === p.id ? '#0B7FC7' : '#E8E3DC',
                borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}>{p.name}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Hero Image', placeholder: '🖼 Hero photo (first impression)' },
              { label: 'Gallery Photo 1', placeholder: '📸 Site overview' },
              { label: 'Gallery Photo 2', placeholder: '📸 Road access' },
              { label: 'Gallery Photo 3', placeholder: '📸 Nearby amenities' },
              { label: 'Virtual Tour Video', placeholder: '🎬 Tour video link' },
              { label: 'Project Brochure', placeholder: '📄 PDF brochure' },
            ].map((m, i) => (
              <div key={i} style={{
                background: '#fff', border: '2px dashed #E8E3DC', borderRadius: 10,
                padding: '20px', textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{m.placeholder.split(' ')[0]}</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: '#9B8E82', fontFamily: "'Inter', sans-serif" }}>Click to upload</div>
              </div>
            ))}
          </div>

          <button style={{
            background: '#E8A020', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}>Publish to Website</button>
        </div>
      )}

      {tab === 'blog' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button style={{
              background: '#0B7FC7', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}>+ New Post</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {blogPosts.map((post, i) => (
              <div key={i} style={{
                background: '#fff', border: '1px solid #E8E3DC', borderRadius: 10,
                padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 15, color: '#1a1a1a' }}>{post.title}</div>
                  <div style={{ fontSize: 12, color: '#9B8E82', fontFamily: "'Inter', sans-serif", marginTop: 3 }}>{post.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{
                    background: post.published ? '#D1FAE5' : '#F0EBE4',
                    color: post.published ? '#065F46' : '#6B5E53',
                    borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                  }}>{post.published ? 'Published' : 'Draft'}</span>
                  <button style={{
                    background: '#F5F0EB', border: '1px solid #E8E3DC', borderRadius: 7,
                    padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a4a4a', fontFamily: "'Inter', sans-serif",
                  }}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'referrals' && (
        <div style={{ background: '#fff', border: '1px solid #E8E3DC', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAF8' }}>
                {['Partner', 'Referrals sent', 'Conversions', 'Value generated', 'Rate'].map(h => (
                  <th key={h} style={{
                    padding: '12px 20px', textAlign: 'left',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: '#9B8E82', fontFamily: "'Inter', sans-serif", borderBottom: '1px solid #E8E3DC',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referralPartners.map((p, i) => (
                <tr key={i} style={{ borderBottom: i < referralPartners.length - 1 ? '1px solid #F0EBE4' : 'none' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>{p.name}</td>
                  <td style={{ padding: '16px 20px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{p.referrals}</td>
                  <td style={{ padding: '16px 20px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14, color: '#0B7FC7' }}>{p.conversions}</td>
                  <td style={{ padding: '16px 20px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14, color: '#065F46' }}>KES {p.value}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      background: '#EFF6FF', color: '#0B7FC7', borderRadius: 999,
                      padding: '3px 10px', fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
                    }}>{Math.round((p.conversions / p.referrals) * 100)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
