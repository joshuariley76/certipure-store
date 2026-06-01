import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getProducts() {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')
  return data || []
}

export default async function TestingPage() {
  const products = await getProducts()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-[#0f1540] text-white py-16 px-4 text-center">
        <h1 className="text-3xl font-bold mb-3">Testing &amp; Certifications</h1>
        <p className="text-white/60 text-sm max-w-2xl mx-auto leading-relaxed">
          All CertiPure products undergo independent third-party testing for
          identity, purity, and concentration by accredited analytical
          laboratories. Each batch is evaluated before release so you can
          research with confidence.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Product COA grid */}
        {products.length === 0 ? (
          <p className="text-center text-sm text-gray-400">
            Our catalog is being updated. Please check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product: any) => {
              const strength =
                product.size != null
                  ? `${product.size}${product.unit || ''}`
                  : null
              return (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-gray-900">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {strength && <span>{strength}</span>}
                      {strength && product.sku && (
                        <span className="text-gray-300"> · </span>
                      )}
                      {product.sku && (
                        <span className="font-mono">SKU {product.sku}</span>
                      )}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                    COA Pending
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* COA-on-request section */}
        <div className="mt-12 bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Certificates of Analysis available upon request
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
            A Certificate of Analysis (COA) for any product batch is available on
            request. To obtain documentation for a specific item, please contact
            our compliance team at{' '}
            <a
              href="mailto:compliance@certipure.net"
              className="text-[#2d3ca5] font-semibold hover:underline"
            >
              compliance@certipure.net
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
