'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/use-cart'
import type { CartItem as CartItemType } from '@/lib/types'

const MIN_QTY = 1
const MAX_QTY = 10

const PACK_LABEL: Record<1 | 3 | 5, string> = {
  1: 'Single Vial',
  3: '3-Pack',
  5: '5-Pack',
}

export default function CartItem({
  item,
  onNavigate,
  compact = false,
}: {
  item: CartItemType
  onNavigate?: () => void
  compact?: boolean
}) {
  const { updateQuantity, removeFromCart } = useCart()
  const [busy, setBusy] = useState(false)

  const unitPrice = Number(item.price_at_add)
  const lineTotal = unitPrice * item.quantity
  const packLabel = PACK_LABEL[item.pack_size] ?? `${item.pack_size}-Pack`
  const product = item.product

  const atMin = item.quantity <= MIN_QTY
  const atMax = item.quantity >= MAX_QTY

  const change = async (delta: number) => {
    if (busy) return
    const next = item.quantity + delta
    if (next < MIN_QTY || next > MAX_QTY) return
    setBusy(true)
    try {
      await updateQuantity(item.id, next)
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (busy) return
    setBusy(true)
    try {
      await removeFromCart(item.id)
    } catch (err) {
      console.error(err)
      setBusy(false)
    }
  }

  const stepperBtnBase =
    'w-7 h-7 rounded-md border font-bold text-sm flex items-center justify-center transition'
  const stepperBtnEnabled = 'border-gray-200 bg-white text-[#2d3ca5] hover:border-[#2d3ca5]'
  const stepperBtnDisabled = 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'

  return (
    <div className={`flex gap-3 ${compact ? 'py-3' : 'py-4'} border-b border-gray-100 last:border-b-0`}>
      <Link
        href={product ? `/product/${product.slug}` : '#'}
        onClick={onNavigate}
        className="flex-shrink-0 bg-gray-50 rounded-lg flex items-center justify-center"
        style={{ width: compact ? 72 : 96, height: compact ? 72 : 96 }}
      >
        <img
          src="/certipure-vial-product.jpg"
          alt={product?.name ?? 'Product'}
          className={compact ? 'h-14 w-auto object-contain' : 'h-20 w-auto object-contain'}
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={product ? `/product/${product.slug}` : '#'}
              onClick={onNavigate}
              className="block text-sm font-semibold text-gray-900 truncate hover:text-[#2d3ca5] transition"
            >
              {product?.name ?? 'Product'}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">{packLabel}</p>
            <p className="text-xs text-gray-400">${unitPrice.toFixed(2)} each</p>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label="Remove from cart"
            className="text-gray-400 hover:text-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => change(-1)}
              disabled={atMin || busy}
              aria-label="Decrease quantity"
              className={`${stepperBtnBase} ${atMin ? stepperBtnDisabled : stepperBtnEnabled}`}
            >
              −
            </button>
            <span className="min-w-[1.5rem] text-center text-sm font-bold text-gray-900 select-none">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => change(1)}
              disabled={atMax || busy}
              aria-label="Increase quantity"
              className={`${stepperBtnBase} ${atMax ? stepperBtnDisabled : stepperBtnEnabled}`}
            >
              +
            </button>
          </div>
          <span className="text-sm font-extrabold text-[#2d3ca5]">${lineTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
