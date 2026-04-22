import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import FeaturedCarousel from '@/components/FeaturedCarousel'

export const dynamic = 'force-dynamic'

async function getFeaturedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
  if (error) console.error('Featured error:', error.message)
  return data || []
}

async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id, name, slug)')
    .eq('is_active', true)
    .order('name')
  if (error) console.error('Products error:', error.message)
  return data || []
}

async function getCOAs() {
  const { data, error } = await supabase
    .from('coas')
    .select('*, product:products(name, slug)')
    .order('test_date', { ascending: false })
    .limit(5)
  if (error) console.error('COAs error:', error.message)
  return data || []
}

async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
  if (error) console.error('Categories error:', error.message)
  return data || []
}

export default async function HomePage() {
  const [featured, allProducts, coas, categories] = await Promise.all([
    getFeaturedProducts(),
    getAllProducts(),
    getCOAs(),
    getCategories(),
  ])

  return (
    <main>
      {/* Hero */}
      <section>
        <img src="/certipure-hero-image.jpg" alt="CertiPure" className="w-full h-auto block" />
      </section>

      {/* Research Banner */}
      <div className="bg-[#2d3ca5] text-white text-center py-2.5 px-4 text-xs font-bold tracking-[3px] uppercase">
        For Research Use Only
      </div>

      {/* Trust Badges */}
      <div className="bg-gray-50 py-5 px-4">
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
          <div className="flex-1 flex items-center justify-center gap-3 py-4 px-4">
            <span className="font-semibold text-sm text-gray-800">Lab Tested</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-3 py-4 px-4">
            <span className="font-semibold text-sm text-gray-800">99%+ Purity</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-3 py-4 px-4">
            <span className="font-semibold text-sm text-gray-800">Fast USA Shipping</span>
          </div>
        </div>
      </div>

      {/* Debug info */}
      <div className="max-w-4xl mx-auto px-4 py-4 bg-yellow-50 border border-yellow-200 rounded-xl my-4 text-sm">
        <p><strong>Debug:</strong> Featured products found: {featured.length} | All products: {allProducts.length} | COAs: {coas.length} | Categories: {categories.length}</p>
      </div>

      {/* Featured Carousel */}
      {featured.length > 0 && (
        <section className="py-14 px-4 bg-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Featured Peptides</h2>
            <p className="text-gray-400 text-sm mt-2">Swipe to explore our most popular products</p>
          </div>
          <FeaturedCarousel products={featured} />
        </section>
      )}

      {/* Catalog by Category */}
      {categories.length > 0 && (
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Peptide Catalog</h2>
            </div>
            {categories.map((cat: any) => {
              const catProducts = allProducts.filter((p: any) => p.category?.id === cat.id)
              if (catProducts.length === 0) return null
              return (
                <div key={cat.id} className="mb-12">
                  <div className="inline-block text-sm font-bold uppercase tracking-wider text-[#2d3ca5] mb-5 pb-2 border-b-2 border-[#2d3ca5]">
                    {cat.name}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {catProducts.map((product: any) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Testing Results */}
      {coas.length > 0 && (
        <section className="bg-[#0f1540] py-16 px-4 text-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>Third-Party Lab Tested</h2>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-white/40 uppercase tracking-wider">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Batch</th>
                    <th className="px-5 py-3">Purity</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {coas.map((coa: any) => (
                    <tr key={coa.id} className="border-t border-white/5">
                      <td className="px-5 py-3 font-medium">{coa.product?.name || 'Product'}</td>
                      <td className="px-5 py-3 text-white/50 font-mono text-xs">{coa.batch_number}</td>
                      <td className="px-5 py-3 text-green-400 font-bold">{coa.purity_percent}%</td>
                      <td className="px-5 py-3 text-white/50">{new Date(coa.test_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="bg-[#0f1540] py-14 px-4 text-center border-t border-white/10">
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Stay Updated</h2>
        <p className="text-white/40 text-sm mb-6">Get notified about new products and batch releases.</p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input type="email" placeholder="Enter your email" className="flex-1 px-5 py-3 rounded-full bg-white/10 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none" />
          <button className="bg-[#2d3ca5] text-white font-bold text-sm px-7 py-3 rounded-full hover:bg-[#3a4bbf] transition">Subscribe</button>
        </div>
      </section>
    </main>
  )
}