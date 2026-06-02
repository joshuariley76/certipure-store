import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

// A unique share card per product (shown when a product link is posted to
// Facebook, X/Twitter, iMessage, etc.). Generated on demand from the database.
export const alt = 'CertiPure Research Peptide'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function ProductOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { data: product } = await supabase
    .from('products')
    .select('name, size, unit, category:categories(name)')
    .eq('slug', slug)
    .single()

  const name = product?.name || 'Research Peptide'
  const strength = product ? `${product.size ?? ''}${product.unit ?? ''}` : ''
  const category =
    (product?.category as { name?: string } | null)?.name || 'Research Peptide'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '70px 80px',
          backgroundColor: '#0f1540',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          <span style={{ color: '#ffffff' }}>Certi</span>
          <span style={{ color: '#6b7cff' }}>Pure</span>
        </div>

        {/* Product */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              color: '#8a93c2',
              letterSpacing: 4,
              marginBottom: 16,
            }}
          >
            {category.toUpperCase()}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 84,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
          {strength ? (
            <div style={{ display: 'flex', fontSize: 44, color: '#6b7cff', marginTop: 18 }}>
              {strength}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', height: 6, width: 90, backgroundColor: '#2d3ca5', borderRadius: 3, marginRight: 24 }} />
          <div style={{ display: 'flex', fontSize: 26, color: '#e2e8f0' }}>
            Research Peptides · Third-Party Tested
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
