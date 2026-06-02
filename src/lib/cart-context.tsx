'use client'

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CartItem } from '@/lib/types'

type PackSize = 1 | 3 | 5

export type CartContextValue = {
  items: CartItem[]
  itemCount: number
  subtotal: number
  isLoading: boolean
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  addToCart: (productId: string, packSize: PackSize, quantity: number, priceAtAdd: number) => Promise<void>
  removeFromCart: (cartItemId: string) => Promise<void>
  updateQuantity: (cartItemId: string, newQuantity: number) => Promise<void>
  clearCart: () => Promise<void>
}

export const CartContext = createContext<CartContextValue | null>(null)

const MIN_QTY = 1
const MAX_QTY = 10

export function CartProvider({ children }: { children: ReactNode }) {
  // The shared, cookie-based browser client — the same single instance the
  // navbar, sign-in modal, and checkout use. createClient() returns a cached
  // client, so this does not spin up a competing auth instance. Using this
  // client (rather than the localStorage-based singleton) is what lets the cart
  // see the logged-in session, which lives in cookies.
  const supabase = createClient()

  const [items, setItems] = useState<CartItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const fetchCart = useCallback(
    async (uid: string) => {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', uid)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('Cart fetch error:', error.message)
        setItems([])
        return
      }
      setItems((data as unknown as CartItem[]) || [])
    },
    [supabase],
  )

  useEffect(() => {
    let cancelled = false

    // Initial load: wait for the session that's already stored (in the cookie)
    // to be read before deciding whether anyone is signed in. getSession()
    // reads the existing session rather than forcing a fresh network check.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (uid) fetchCart(uid)
      else setItems([])
      setIsLoading(false)
    })

    // Stay in sync with sign-in, sign-out, and token refreshes. We take the
    // user from the session the listener hands us — not a separate getUser()
    // call. The cart fetch is deferred with setTimeout so we don't query
    // Supabase from inside this callback while it still holds the auth lock
    // (doing so can deadlock).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        setTimeout(() => {
          if (!cancelled) fetchCart(uid)
        }, 0)
      } else {
        setItems([])
        setIsDrawerOpen(false)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [supabase, fetchCart])

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  const addToCart = useCallback<CartContextValue['addToCart']>(
    async (productId, packSize, quantity, priceAtAdd) => {
      if (!userId) throw new Error('You must be signed in to add items to your cart.')
      const qty = Math.max(MIN_QTY, Math.min(MAX_QTY, quantity))

      const { data: existing, error: lookupError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('pack_size', packSize)
        .maybeSingle()
      if (lookupError) throw new Error(lookupError.message)

      if (existing) {
        const newQty = Math.min(MAX_QTY, existing.quantity + qty)
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQty })
          .eq('id', existing.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('cart_items').insert({
          user_id: userId,
          product_id: productId,
          pack_size: packSize,
          quantity: qty,
          price_at_add: priceAtAdd,
        })
        if (error) throw new Error(error.message)
      }

      await fetchCart(userId)
    },
    [supabase, userId, fetchCart],
  )

  const removeFromCart = useCallback<CartContextValue['removeFromCart']>(
    async (cartItemId) => {
      const prev = items
      setItems(items.filter((it) => it.id !== cartItemId))
      const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId)
      if (error) {
        console.error('Cart remove error:', error.message)
        setItems(prev)
        throw new Error(error.message)
      }
    },
    [supabase, items],
  )

  const updateQuantity = useCallback<CartContextValue['updateQuantity']>(
    async (cartItemId, newQuantity) => {
      const qty = Math.max(MIN_QTY, Math.min(MAX_QTY, newQuantity))
      const prev = items
      setItems(items.map((it) => (it.id === cartItemId ? { ...it, quantity: qty } : it)))
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: qty })
        .eq('id', cartItemId)
      if (error) {
        console.error('Cart update error:', error.message)
        setItems(prev)
        throw new Error(error.message)
      }
    },
    [supabase, items],
  )

  const clearCart = useCallback<CartContextValue['clearCart']>(async () => {
    if (!userId) return
    const prev = items
    setItems([])
    const { error } = await supabase.from('cart_items').delete().eq('user_id', userId)
    if (error) {
      console.error('Cart clear error:', error.message)
      setItems(prev)
      throw new Error(error.message)
    }
  }, [supabase, userId, items])

  const itemCount = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items])
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.price_at_add) * it.quantity, 0),
    [items],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      isLoading,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [items, itemCount, subtotal, isLoading, isDrawerOpen, openDrawer, closeDrawer, addToCart, removeFromCart, updateQuantity, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
