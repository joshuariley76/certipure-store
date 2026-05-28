'use client'

import Link from 'next/link'
import { useCart } from '@/lib/use-cart'
import CartItem from '@/components/CartItem'

export default function CartPage() {
  const { items, itemCount, subtotal, isLoading } = useCart()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-400">Loading your cart…</div>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 text-sm mb-6">Browse the catalog and add some research peptides.</p>
          <Link
            href="/shop"
            className="inline-block bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold text-sm px-8 py-3 rounded-full transition"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Your Cart</h1>
        <p className="text-sm text-gray-500 mb-8">
          {itemCount === 1 ? '1 item' : `${itemCount} items`}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-2xl px-5">
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <CartItem item={item} />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-400 text-xs">Calculated at checkout</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-400 text-xs">Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-xl font-extrabold text-[#2d3ca5]">${subtotal.toFixed(2)}</span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="mt-6 block w-full text-center bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold text-sm px-4 py-3 rounded-lg transition"
              >
                Proceed to Checkout
              </Link>
              <Link
                href="/shop"
                className="mt-3 block text-center text-sm text-gray-500 hover:text-[#2d3ca5] transition"
              >
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
