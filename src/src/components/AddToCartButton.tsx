'use client'

import { Product } from '@/lib/types'
import { useCart } from '@/lib/cart-context'
import { useState } from 'react'

export default function AddToCartButton({ product, className = '' }: { product: Product, className?: string }) {
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)

  const handleClick = () => {
    addToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button
      onClick={handleClick}
      className={`${className} ${added ? 'bg-green-600' : 'bg-[#2d3ca5] hover:bg-[#232f82]'} text-white font-semibold rounded-lg transition-all`}
    >
      {added ? '✓ Added!' : 'Add to Cart'}
    </button>
  )
}
