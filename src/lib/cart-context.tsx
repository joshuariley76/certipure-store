'use client'

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

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

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (user) {
        setUserId(user.id)
        await fetchCart(user.id)
      } else {
        setUserId(null)
        setItems([])
      }
      setIsLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUid = session?.user?.id ?? null
      setUserId(newUid)
      if (newUid) {
        await fetchCart(newUid)
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
