import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import PackSelector from '@/components/PackSelector'
import ProductLabel, { productLabelProps } from '@/components/ProductLabel'

export const dynamic = 'force-dynamic'

async function getProduct(slug: string) {
  const { data } = await supabase.from('products').select('*, category:categories(id, name, slug)').eq('slug', slug).eq('is_active', true).single()
  return data
}

// Unique <title> and meta description per product, for search engines and link
// previews. Title: "Name (Strength) | CertiPure Research Peptides".
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) {
    return { title: 'Product Not Found | CertiPure Research Peptides' }
  }
  const strength = `${product.size ?? ''}${product.unit ?? ''}`
  const title = strength
    ? `${product.name} (${strength}) | CertiPure Research Peptides`
    : `${product.name} | CertiPure Research Peptides`
  const description = (product.short_description || '').slice(0, 160)
  // The per-product share image comes from the sibling opengraph-image.tsx.
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/product/${slug}`,
      siteName: 'CertiPure',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

async function getCOAs(productId: string) {
  const { data } = await supabase.from('coas').select('*').eq('product_id', productId).order('test_date', { ascending: false })
  return data || []
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const coas = await getCOAs(product.id)

  // Stock state. A null/undefined stock_quantity is treated as "in stock" (the
  // column simply isn't tracked for that product). 0 = out of stock; 1–10 = low.
  const stock: number | null =
    typeof product.stock_quantity === 'number' ? product.stock_quantity : null
  const outOfStock = stock === 0
  const lowStock = stock !== null && stock > 0 && stock <= 10

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-[#2d3ca5]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="hover:text-[#2d3ca5]">Shop</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{product.name}</span>
        </div>
        <div className="grid md:grid-cols-2 gap-10 mb-16">
          <div className="bg-gray-50 rounded-2xl p-8 flex items-center justify-center">
            <div className="w-full max-w-[360px] h-[420px]">
              <ProductLabel {...productLabelProps(product)} />
            </div>
          </div>
          <div>
            <p className="text-sm text-[#2d3ca5] font-semibold uppercase tracking-wider mb-2">{product.category?.name || 'Peptide'}</p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-400 text-sm mb-4">{product.size}{product.unit} • SKU: {product.sku}</p>
            {outOfStock && (
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700 mb-4">
                Out of Stock
              </span>
            )}
            {lowStock && (
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 mb-4">
                Low Stock — only {stock} left
              </span>
            )}
            <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>
            <div className="mb-6">
              {product.coa_url ? (
                <a
                  href={product.coa_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#2d3ca5] hover:bg-[#23306b] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Certificate of Analysis
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 bg-gray-100 text-gray-400 text-sm font-semibold px-5 py-2.5 rounded-lg cursor-not-allowed">
                  COA Pending
                </span>
              )}
            </div>
            <PackSelector product={product} outOfStock={outOfStock} />
          </div>
        </div>
        {coas.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Testing Results</h2>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left text-xs text-gray-500 uppercase">
                    <th className="px-5 py-3">Batch</th>
                    <th className="px-5 py-3">Purity</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {coas.map((coa: any) => (
                    <tr key={coa.id} className="border-t border-gray-200">
                      <td className="px-5 py-3.5 font-mono text-xs">{coa.batch_number}</td>
                      <td className="px-5 py-3.5 text-green-600 font-bold">{coa.purity_percent}%</td>
                      <td className="px-5 py-3.5 text-gray-500">{new Date(coa.test_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}