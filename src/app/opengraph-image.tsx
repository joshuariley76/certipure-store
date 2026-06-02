import { ImageResponse } from 'next/og'

// Default social share card for the whole site (homepage and any page without
// its own card). Rendered at build/request time — no image file needed.
export const alt = 'CertiPure — Premium Research Peptides'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f1540',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 800, letterSpacing: -3 }}>
          <span style={{ color: '#ffffff' }}>Certi</span>
          <span style={{ color: '#6b7cff' }}>Pure</span>
        </div>
        <div style={{ display: 'flex', fontSize: 42, marginTop: 12, color: '#e2e8f0' }}>
          Premium Research Peptides
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            height: 6,
            width: 220,
            backgroundColor: '#2d3ca5',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            marginTop: 36,
            color: '#8a93c2',
            letterSpacing: 6,
          }}
        >
          TESTED · TRUSTED · AFFORDABLE
        </div>
      </div>
    ),
    { ...size },
  )
}
