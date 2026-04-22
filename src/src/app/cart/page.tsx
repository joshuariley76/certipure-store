'use client'

import { useCart } from '@/lib/cart-context'
import Link from 'next/link'

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-400 text-sm mb-6">Browse our catalog and add some research peptides.</p>
          <Link href="/shop" className="inline-block bg-[#2d3ca5] text-white font-semibold text-sm px-8 py-3 rounded-full hover:bg-[#232f82] transition">
            Shop Peptides
          </Link>
        </div>
      </main>
    )
  }

  const shipping = totalPrice >= 200 ? 0 : 15
  const orderTotal = totalPrice + shipping

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="md:col-span-2 space-y-4">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <img src="/certipure-vial-product.jpg" alt={product.name} className="h-16 w-auto object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${product.slug}`} className="font-bold text-sm text-gray-900 hover:text-[#2d3ca5] transition">
                    {product.name}
                  </Link>
                  <p className="text-xs text-gray-400">{product.size}{product.unit} • Lyophilized</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[#2d3ca5]">${(product.price * quantity).toFixed(2)}</span>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="text-gray-300 hover:text-red-500 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-500 transition mt-2">
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit sticky top-24">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal ({totalItems} items)</span>
                <span className="font-semibold">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="font-semibold">{shipping === 0 ? <span className="text-green-600">FREE</span> : `$${shipping.toFixed(2)}`}</span>
              </div>
              {totalPrice < 200 && (
                <p className="text-xs text-gray-400 bg-blue-50 p-2 rounded-lg">
                  Add ${(200 - totalPrice).toFixed(2)} more for free shipping!
                </p>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="font-bold text-base">Total</span>
                <span className="font-extrabold text-xl text-[#2d3ca5]">${orderTotal.toFixed(2)}</span>
              </div>
            </div>
            <button className="w-full bg-[#2d3ca5] text-white font-bold text-sm py-3.5 rounded-xl mt-6 hover:bg-[#232f82] transition">
              Proceed to Checkout
            </button>
            <Link href="/shop" className="block text-center text-sm text-gray-400 hover:text-[#2d3ca5] mt-3 transition">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
