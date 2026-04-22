'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Product } from '@/lib/types'
import AddToCartButton from './AddToCartButton'

export default function FeaturedCarousel({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const scroll = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0))
    setScrollLeft(scrollRef.current?.scrollLeft || 0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0)
    const walk = (x - startX) * 1.5
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => setIsDragging(false)

  return (
    <div className="relative max-w-[1200px] mx-auto">
      {/* Left arrow */}
      <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-blue-50 hover:border-[#2d3ca5] transition">
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      </button>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex gap-5 overflow-x-auto px-14 pb-4 scrollbar-hide snap-x snap-mandatory ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => (
          <div key={product.id} className="min-w-[250px] max-w-[250px] snap-start bg-white border border-gray-200 rounded-2xl overflow-hidden flex-shrink-0 hover:-translate-y-1 hover:shadow-xl transition-all">
            <Link href={`/product/${product.slug}`}>
              <div className="relative bg-gray-50 h-[260px] flex items-center justify-center p-4">
                {product.badge && (
                  <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full z-10 ${
                    product.badge === 'Best Seller' || product.badge === 'Popular'
                      ? 'bg-[#2d3ca5] text-white'
                      : 'bg-blue-50 text-[#2d3ca5]'
                  }`}>
                    {product.badge}
                  </span>
                )}
                <img src="/certipure-vial-product.jpg" alt={product.name} className="h-[220px] w-auto object-contain" />
              </div>
            </Link>
            <div className="p-4">
              <p className="text-[11px] text-[#2d3ca5] font-semibold uppercase tracking-wider mb-1">Peptide</p>
              <Link href={`/product/${product.slug}`}>
                <h3 className="font-bold text-sm text-gray-900 hover:text-[#2d3ca5] transition">{product.name} ({product.size}{product.unit})</h3>
              </Link>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.short_description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xl font-extrabold text-[#2d3ca5]">${product.price}</span>
                <AddToCartButton product={product} className="text-xs px-4 py-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-blue-50 hover:border-[#2d3ca5] transition">
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  )
}
