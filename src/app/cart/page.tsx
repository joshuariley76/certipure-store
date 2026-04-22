'use client'

import Link from 'next/link'

export default function CartPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-400 text-sm mb-6">Browse our catalog and add some research peptides.</p>
        <Link href="/shop" className="inline-block bg-[#2d3ca5] text-white font-semibold text-sm px-8 py-3 rounded-full hover:bg-[#232f82] transition">Shop Peptides</Link>
      </div>
    </main>
  )
}