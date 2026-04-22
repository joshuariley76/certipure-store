import { supabase } from '@/lib/supabase'
import { Product } from '@/lib/types'
import ProductCard from '@/components/ProductCard'

async function getProducts() {
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(id, name, slug)')
    .eq('is_active', true)
    .order('name')
  return (data as Product[]) || []
}

async function getCategories() {
  const { data } = await supabase.from('categories').select('*').order('sort_order')
  return data || []
}

export default async function ShopPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()])

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Shop Peptides</h1>
          <p className="text-gray-400 text-sm mt-2">Browse our complete catalog of research peptides. Every batch third-party tested.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {categories.map((cat: any) => {
          const catProducts = products.filter((p: any) => p.category?.id === cat.id)
          if (catProducts.length === 0) return null
          return (
            <div key={cat.id} className="mb-12">
              <div className="inline-block text-sm font-bold uppercase tracking-wider text-[#2d3ca5] mb-5 pb-2 border-b-2 border-[#2d3ca5]">
                {cat.name}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {catProducts.map((product: Product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
