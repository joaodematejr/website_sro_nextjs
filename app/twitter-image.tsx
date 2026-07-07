import { ImageResponse } from 'next/og'

export const alt = 'Silkroad Online'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(140deg, #020617, #0f172a 55%, #1e293b)',
          color: '#e2e8f0',
          padding: '56px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '999px', background: '#22d3ee' }} />
          <div style={{ fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>Official Portal</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1 }}>Silkroad Online</div>
          <div style={{ fontSize: 34, opacity: 0.9 }}>Noticias, cadastro e download oficial</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24, color: '#67e8f9' }}>sro.digeam.com</div>
          <div
            style={{
              fontSize: 24,
              border: '1px solid rgba(148,163,184,0.5)',
              borderRadius: 10,
              padding: '8px 14px',
            }}
          >
            MMORPG
          </div>
        </div>
      </div>
    ),
    size,
  )
}
