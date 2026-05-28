'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/use-cart'
import CartItem from '@/components/CartItem'

export default function CartDrawer() {
  const { items, itemCount, subtotal, isDrawerOpen, closeDrawer, isLoading } = useCart()

  useEffect(() => {
    if (!isDrawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isDrawerOpen, closeDrawer])

  return (
    <>
      <div
        aria-hidden={!isDrawerOpen}
        onClick={closeDrawer}
        className={`fixed inset-0 z-[55] bg-black/50 transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!isDrawerOpen}
        className={`fixed top-0 right-0 z-[56] h-full w-full sm:w-[400px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
            <p className="text-xs text-gray-500">
              {itemCount === 0 ? 'No items' : itemCount === 1 ? '1 item' : `${itemCount} items`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="text-gray-400 hover:text-gray-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 6l12 12" />
              <path d="M18 6l-12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-base font-semibold text-gray-900 mb-1">Your cart is empty</p>
              <p className="text-sm text-gray-500 mb-6">Browse the catalog to add research peptides.</p>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-block bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <CartItem item={item} onNavigate={closeDrawer} compact />
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-gray-200 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-lg font-extrabold text-[#2d3ca5]">${subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400">Shipping and taxes calculated at checkout.</p>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="block w-full text-center border-2 border-gray-200 text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:border-gray-300 transition"
            >
              View Cart
            </Link>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full text-center bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold text-sm px-4 py-3 rounded-lg transition"
            >
              Proceed to Checkout
            </Link>
          </footer>
        )}
      </aside>
    </>
  )
}
