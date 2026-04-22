import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'

export const dynamic = 'force-dynamic'

async function getProduct(slug: string) {
  const { data } = await supabase.from('products').select('*, category:categories(id, name, slug)').eq('slug', slug).eq('is_active', true).single()
  return data
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
            <img src="/certipure-vial-product.jpg" alt={product.name} className="max-h-[400px] w-auto object-contain" />
          </div>
          <div>
            <p className="text-sm text-[#2d3ca5] font-semibold uppercase tracking-wider mb-2">{product.category?.name || 'Peptide'}</p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-400 text-sm mb-4">{product.size}{product.unit} • SKU: {product.sku}</p>
            <span className="text-4xl font-extrabold text-[#2d3ca5] block mb-6">${product.price}</span>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>
            <button className="w-full bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold py-3.5 rounded-xl transition text-base">Add to Cart</button>
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