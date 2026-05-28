'use client'

import { useContext } from 'react'
import { CartContext, type CartContextValue } from '@/lib/cart-context'

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used inside a <CartProvider>. Did you forget to wrap your app?')
  }
  return ctx
}
