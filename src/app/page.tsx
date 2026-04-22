import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import FeaturedCarousel from '@/components/FeaturedCarousel'

export const dynamic = 'force-dynamic'

async function getFeaturedProducts() {
  const { data, error } = await supabase.from('products').select('*').eq('is_active', true).eq('is_featured', true)
  if (error) console.error('Featured error:', error.message)
  return data || []
}

async function getAllProducts() {
  const { data, error } = await supabase.from('products').select('*, category:categories(id, name, slug)').eq('is_active', true).order('name')
  if (error) console.error('Products error:', error.message)
  return data || []
}

async function getCOAs() {
  const { data, error } = await supabase.from('coas').select('*, product:products(name, slug)').order('test_date', { ascending: false }).limit(5)
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
    <main>
      <section>
        <img src="/certipure-hero-image.jpg" alt="CertiPURE - Tested Trusted Affordable" className="w-full h-auto block" />
      </section>

      <section className="bg-white py-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Verified Quality" },
            { icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0", label: "Fast Shipping" },
            { icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", label: "Lab Grade" },
            { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "99%+ Purity" },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl py-8 px-4 text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-[#2d3ca5]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d={item.icon}/></svg>
              <p className="font-bold text-sm text-gray-900">{item.label}</p>
            </div>
          ))}
        </div>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-white/40 uppercase tracking-wider">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Batch</th>
                    <th className="px-6 py-4">Purity</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {coas.map((coa: any) => (
                    <tr key={coa.id} className="border-t border-white/5">
                      <td className="px-6 py-4 font-medium">{coa.product?.name}</td>
                      <td className="px-6 py-4 text-white/50 font-mono text-xs">{coa.batch_number}</td>
                      <td className="px-6 py-4 text-green-400 font-bold">{coa.purity_percent}%</td>
                      <td className="px-6 py-4 text-white/50">{new Date(coa.test_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#0f1540] py-14 px-6 text-center border-t border-white/10">
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Stay Updated</h2>
        <p className="text-white/40 text-sm mb-6">Get notified about new products and batch releases.</p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input type="email" placeholder="Enter your email" className="flex-1 px-5 py-3 rounded bg-white/10 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none" />
          <button className="bg-[#2d3ca5] text-white font-bold text-sm px-7 py-3 rounded hover:bg-[#3a4bbf] transition">Subscribe</button>
        </div>
      </section>
    </main>
  )
}