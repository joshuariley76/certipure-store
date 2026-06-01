'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/use-cart'

type AddState = 'idle' | 'loading' | 'success' | 'error'

export default function ProductCard({ product }: { product: any }) {
  const { addToCart, openDrawer } = useCart()
  const [addState, setAddState] = useState<AddState>('idle')
  const [addError, setAddError] = useState<string | null>(null)

  // Quick-add a single vial from the listing. Pack/quantity selection lives on
  // the product detail page via PackSelector.
  const unitPrice = product.price_single != null ? Number(product.price_single) : Number(product.price)

  const handleAdd = async () => {
    if (addState === 'loading') return
    setAddError(null)
    setAddState('loading')
    try {
      await addToCart(product.id, 1, 1, unitPrice)
      setAddState('success')
      openDrawer()
      window.setTimeout(() => setAddState('idle'), 1500)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add to cart.')
      setAddState('error')
      window.setTimeout(() => setAddState('idle'), 2500)
    }
  }

  const buttonLabel =
    addState === 'success' ? 'Added!' : addState === 'loading' ? 'Adding…' : 'Add to Cart'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all">
      <Link href={`/product/${product.slug}`}>
        <div className="relative bg-gray-50 h-[240px] flex items-center justify-center p-4">
          {product.badge && product.badge !== 'Best Seller' && product.badge !== 'Popular' && (
            <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full z-10 bg-blue-50 text-[#2d3ca5]">
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
          <span className="text-xl font-extrabold text-[#2d3ca5]">
            {product.price_single != null && product.price_5pack != null
              ? `$${product.price_single} – $${product.price_5pack}`
              : `$${product.price}`}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={addState === 'loading'}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition disabled:cursor-wait ${
              addState === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-[#2d3ca5] hover:bg-[#232f82] text-white'
            }`}
          >
            {buttonLabel}
          </button>
        </div>
        {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
      </div>
    </div>
  )
}
