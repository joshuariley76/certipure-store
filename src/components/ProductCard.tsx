import Link from 'next/link'

// Catalog/listing card. Tapping anywhere takes the customer to the product
// detail page, where pack size (1/3/5 vials) and Add to Cart live.
export default function ProductCard({ product }: { product: any }) {
  // Some product names already include the strength (e.g. "GHK-Cu (50mg)"), so
  // only append it when it isn't already in the name — avoids "(50mg) (50mg)".
  const strength = `${product.size ?? ''}${product.unit ?? ''}`
  const displayName = strength && !product.name.includes(strength)
    ? `${product.name} (${strength})`
    : product.name
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all">
      <Link href={`/product/${product.slug}`}>
        <div className="relative bg-gray-50 h-[220px] overflow-hidden">
          {product.stock_quantity === 0 ? (
            <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full z-10 bg-amber-100 text-amber-800">
              Restock Soon
            </span>
          ) : product.badge && product.badge !== 'Best Seller' && product.badge !== 'Popular' ? (
            <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full z-10 bg-blue-50 text-[#2d3ca5]">
              {product.badge}
            </span>
          ) : null}
          <img src={product.image_url || '/certipure-vial-product.jpg'} alt={product.name} className="w-full h-full object-cover" />
        </div>
      </Link>
      <div className="p-4">
        <p className="text-[11px] text-[#2d3ca5] font-semibold uppercase tracking-wider mb-1">{product.category?.name || 'Peptide'}</p>
        <h3 className="font-bold text-sm text-gray-900">{displayName}</h3>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.short_description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xl font-extrabold text-[#2d3ca5]">
            {product.price_single != null && product.price_5pack != null
              ? `$${product.price_single} – $${product.price_5pack}`
              : `$${product.price}`}
          </span>
          <Link
            href={`/product/${product.slug}`}
            className="text-xs font-semibold px-4 py-2 rounded-lg transition bg-[#2d3ca5] hover:bg-[#232f82] text-white"
          >
            View Product
          </Link>
        </div>
      </div>
    </div>
  )
}
