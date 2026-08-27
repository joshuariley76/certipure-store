'use client'

// The "need water to reconstitute?" reminder.
//
// Shows in the cart drawer, on the cart page and at checkout, but only when
// the cart holds a peptide and no water — so the $10 it advertises is always
// a price the customer genuinely qualifies for. Adding from here puts the
// vial straight in without leaving the cart.
//
// The price is not hard-coded: it comes from lib/water-pricing.ts, the same
// module the cart and the order API use.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/use-cart'
import {
  WATER_SLUG,
  WATER_PRICE_ALONE,
  WATER_PRICE_WITH_ORDER,
} from '@/lib/water-pricing'

// Once dismissed it stays gone for the rest of the visit — it must not come
// back on the cart page and again at checkout.
const DISMISS_KEY = 'certipure:water-upsell-dismissed'

type WaterProduct = {
  id: string
  name: string
  slug: string
  image_url: string | null
  stock_quantity: number
}

export default function WaterUpsell({
  compact = false,
  onAdded,
}: {
  compact?: boolean
  /** Checkout keeps its own copy of the cart rows, so it passes a reloader
   *  here — otherwise its summary would not show the vial just added. */
  onAdded?: () => void
}) {
  const { items, waterQualifies, hasWater, addToCart } = useCart()

  const [water, setWater] = useState<WaterProduct | null>(null)
  const [dismissed, setDismissed] = useState(true) // assume hidden until checked
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false) // private mode etc. — just show it
    }
  }, [])

  // Look the product up once. If it isn't there (not launched yet, or made
  // inactive) the reminder simply never renders.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('products')
      .select('id, name, slug, image_url, stock_quantity')
      .eq('slug', WATER_SLUG)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setWater((data as WaterProduct) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const shouldShow =
    !dismissed &&
    !added &&
    water !== null &&
    water.stock_quantity > 0 &&
    items.length > 0 &&
    waterQualifies &&
    !hasWater

  if (!shouldShow) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* nothing to do — it just reappears next page */
    }
  }

  const add = async () => {
    if (busy || !water) return
    setBusy(true)
    try {
      await addToCart(water.id, 1, 1, WATER_PRICE_WITH_ORDER)
      setAdded(true)
      onAdded?.()
    } catch (err) {
      console.error('Water upsell add failed:', err)
      setBusy(false)
    }
  }

  return (
    <div
      className={`relative flex items-center gap-3 rounded-2xl border border-[#2d3ca5] bg-[#eef1fb] ${
        compact ? 'flex-wrap p-3' : 'p-3.5'
      }`}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="No thanks, hide this"
        className="absolute top-1.5 right-2 text-gray-400 hover:text-gray-700 transition text-lg leading-none p-1"
      >
        ×
      </button>

      <div className="flex-none w-[52px] h-[66px] rounded-lg border border-[#ccd3f0] bg-white flex items-center justify-center overflow-hidden">
        <img
          src={water.image_url || '/certipure-vial-product.jpg'}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      </div>

      <div className="flex-1 min-w-[150px]">
        <p className="text-sm font-bold text-gray-900">Need water to reconstitute?</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          Add {water.name} for{' '}
          <span className="font-extrabold text-[#2d3ca5]">${WATER_PRICE_WITH_ORDER}</span>{' '}
          <span className="line-through text-gray-400">${WATER_PRICE_ALONE}</span> — your order
          qualifies.
        </p>
      </div>

      <button
        type="button"
        onClick={add}
        disabled={busy}
        className={`flex-none text-xs font-bold text-white rounded-lg px-4 py-2.5 transition ${
          compact ? 'w-full' : ''
        } ${busy ? 'bg-[#2d3ca5] opacity-70 cursor-wait' : 'bg-[#2d3ca5] hover:bg-[#232f82]'}`}
      >
        {busy ? 'Adding…' : `Add — $${WATER_PRICE_WITH_ORDER}`}
      </button>
    </div>
  )
}
