import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AddToCartButton from '@/components/AddToCartButton'
import ProductCard from '@/components/ProductCard'
import { Product } from '@/lib/types'

async function getProduct(slug: string) {
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(id, name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data as Product | null
}

async function getCOAs(productId: string) {
  const { data } = await supabase
    .from('coas')
    .select('*')
    .eq('product_id', productId)
    .order('test_date', { ascending: false })
  return data || []
}

async function getRelatedProducts(categoryId: string, currentId: string) {
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(id, name, slug)')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .neq('id', currentId)
    .limit(4)
  return (data as Product[]) || []
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const [coas, related] = await Promise.all([
    getCOAs(product.id),
    product.category_id ? getRelatedProducts(product.category_id, product.id) : Promise.resolve([]),
  ])

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-[#2d3ca5]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="hover:text-[#2d3ca5]">Shop</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{product.name}</span>
        </div>

        {/* Product Detail */}
        <div className="grid md:grid-cols-2 gap-10 mb-16">
          {/* Image */}
          <div className="bg-gray-50 rounded-2xl p-8 flex items-center justify-center relative">
            {product.badge && (
              <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full ${
                product.badge === 'Best Seller' || product.badge === 'Popular'
                  ? 'bg-[#2d3ca5] text-white'
                  : 'bg-blue-50 text-[#2d3ca5]'
              }`}>
                {product.badge}
              </span>
            )}
            <img src="/certipure-vial-product.jpg" alt={product.name} className="max-h-[400px] w-auto object-contain" />
          </div>

          {/* Info */}
          <div>
            <p className="text-sm text-[#2d3ca5] font-semibold uppercase tracking-wider mb-2">
              {product.category?.name || 'Peptide'}
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-400 text-sm mb-4">{product.size}{product.unit} • Lyophilized Powder • SKU: {product.sku}</p>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-extrabold text-[#2d3ca5]">${product.price}</span>
              {product.compare_at_price && (
                <span className="text-lg text-gray-400 line-through">${product.compare_at_price}</span>
              )}
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2.5 h-2.5 rounded-full ${product.stock_quantity > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-gray-600">
                {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            <AddToCartButton product={product} className="w-full py-3.5 text-base mb-4" />

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {['Lab Tested', '99%+ Purity', 'Fast Shipping'].map(badge => (
                <div key={badge} className="bg-gray-50 rounded-xl p-3 text-center">
                  <svg className="w-5 h-5 text-[#2d3ca5] mx-auto mb-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span className="text-xs font-semibold text-gray-600">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COA Results */}
        {coas.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Testing Results</h2>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 font-semibold">Batch</th>
                    <th className="px-5 py-3 font-semibold">Purity</th>
                    <th className="px-5 py-3 font-semibold">Net Content</th>
                    <th className="px-5 py-3 font-semibold">Endotoxins</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Vials Tested</th>
                  </tr>
                </thead>
                <tbody>
                  {coas.map((coa: any) => (
                    <tr key={coa.id} className="border-t border-gray-200">
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{coa.batch_number}</td>
                      <td className="px-5 py-3.5 text-green-600 font-bold">{coa.purity_percent}%</td>
                      <td className="px-5 py-3.5 text-gray-700">{coa.net_content_mg}mg</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${coa.endotoxins_pass ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {coa.endotoxins_pass ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{new Date(coa.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-5 py-3.5 text-gray-500">{coa.vials_tested}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map((p: Product) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
