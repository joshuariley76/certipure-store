'use client'

import Link from 'next/link'

export default function ProductCard({ product }: { product: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all">
      <Link href={`/product/${product.slug}`}>
        <div className="relative bg-gray-50 h-[240px] flex items-center justify-center p-4">
          {product.badge && (
            <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full z-10 ${product.badge === 'Best Seller' || product.badge === 'Popular' ? 'bg-[#2d3ca5] text-white' : 'bg-blue-50 text-[#2d3ca5]'}`}>
              {product.badge}
            </span>
          )}
          <img src="/certipure-vial-product.jpg" alt={product.name} className="h-[200px] w-auto object-contain" />
        </div>
      </Link>
      <div className="p-4">
        <p className="text-[11px] text-[#2d3ca5] font-semibold uppercase tracking-wider mb-1">{product.category?.name || 'Peptide'}</p>
        <h3 className="font-bold text-sm text-gray-900">{product.name} ({product.size}{product.unit})</h3>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.short_description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xl font-extrabold text-[#2d3ca5]">${product.price}</span>
          <button className="bg-[#2d3ca5] hover:bg-[#232f82] text-white text-xs font-semibold px-4 py-2 rounded-lg transition">Add to Cart</button>
        </div>
      </div>
    </div>
  )
}