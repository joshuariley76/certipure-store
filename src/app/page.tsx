import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import FeaturedCarousel from '@/components/FeaturedCarousel'

export const dynamic = 'force-dynamic'

async function getFeaturedProducts() {
  const { data, error } = await supabase.from('products').select('*').not('featured_order', 'is', null).order('featured_order', { ascending: true })
  if (error) console.error('Featured error:', error.message)
  return data || []
}

async function getAllProducts() {
  const { data, error } = await supabase.from('products').select('*, category:categories(id, name, slug)').eq('is_active', true).order('name')
  if (error) console.error('Products error:', error.message)
  return data || []
}

async function getCOAs() {
  const { data, error } = await supabase.from('coas').select('*, product:products(name, slug)').order('test_date', { ascending: false })
  if (error) console.error('COAs error:', error.message)
  return data || []
}

async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  if (error) console.error('Categories error:', error.message)
  return data || []
}

export default async function HomePage() {
  const [featured, allProducts, coas, categories] = await Promise.all([getFeaturedProducts(), getAllProducts(), getCOAs(), getCategories()])

  return (
    <main className="overflow-x-hidden">
      {/* Hero: a single all-in-one image (wordmark, tagline, and badges are
          part of the artwork), so no text overlay is needed. */}
      <section>
        <img src="/certipure-hero-2.jpg" alt="CertiPure — Premium Purity, Wholesale Pricing. USA Lab Tested, 99% Purity, Free Shipping." className="w-full h-auto block" />
      </section>

      {featured.length > 0 && (
        <section className="py-14 px-6 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-10" style={{ fontFamily: "'Playfair Display', serif" }}>Featured Peptides</h2>
            <FeaturedCarousel products={featured} />
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="bg-gray-50 py-16 px-6 border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>Peptide Catalog</h2>
            {categories.map((cat: any) => {
              const catProducts = allProducts.filter((p: any) => p.category?.id === cat.id)
              if (catProducts.length === 0) return null
              return (
                <div key={cat.id} className="mb-14">
                  <div className="inline-block text-sm font-bold uppercase tracking-[2px] text-[#2d3ca5] mb-6 pb-2 border-b-2 border-[#2d3ca5]">{cat.name}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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

      {coas.length > 0 && (
        <section className="bg-[#0f1540] py-16 px-6 text-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-10" style={{ fontFamily: "'Playfair Display', serif" }}>Third-Party Lab Tested</h2>
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="max-h-[28rem] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-[#161d54]">
                    <tr className="text-left text-xs text-white/40 uppercase tracking-wider">
                      <th className="px-3 py-3 sm:px-6 sm:py-4">Product</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4">Batch</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4">Purity</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coas.map((coa: any) => (
                      <tr key={coa.id} className="border-t border-white/5">
                        <td className="px-3 py-3 sm:px-6 sm:py-4 font-medium">{coa.product?.name}</td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-white/50 font-mono text-xs">{coa.batch_number}</td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-green-400 font-bold">{coa.purity || '—'}</td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-white/50">{new Date(coa.test_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-white/40">
              Showing all {coas.length} tested batches — scroll the table to view more.
            </p>
          </div>
        </section>
      )}

      <section className="bg-[#0f1540] py-14 px-6 text-center border-t border-white/10">
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Stay Informed</h2>
        <p className="text-white/40 text-sm mb-6">Get notified about new product availability and lab test results.</p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input type="email" placeholder="Enter your email" className="flex-1 px-5 py-3 rounded bg-white/10 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none" />
          <button className="bg-[#2d3ca5] text-white font-bold text-sm px-7 py-3 rounded hover:bg-[#3a4bbf] transition">Subscribe</button>
        </div>
      </section>
    </main>
  )
}