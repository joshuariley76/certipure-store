'use client'

import { useState } from 'react'
import { useCart } from '@/lib/use-cart'

type PackSize = 1 | 3 | 5
type AddState = 'idle' | 'loading' | 'success' | 'error'

const MIN_QTY = 1
const MAX_QTY = 10

function QuantityStepper({
  quantity,
  setQuantity,
}: {
  quantity: number
  setQuantity: (q: number) => void
}) {
  const atMin = quantity <= MIN_QTY
  const atMax = quantity >= MAX_QTY

  const buttonBase =
    'w-10 h-10 rounded-lg border-2 font-bold text-lg flex items-center justify-center transition'
  const buttonEnabled = 'border-gray-200 bg-white text-[#2d3ca5] hover:border-[#2d3ca5]'
  const buttonDisabled = 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'

  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        type="button"
        onClick={() => setQuantity(Math.max(MIN_QTY, quantity - 1))}
        disabled={atMin}
        aria-label="Decrease quantity"
        className={`${buttonBase} ${atMin ? buttonDisabled : buttonEnabled}`}
      >
        −
      </button>
      <span
        aria-live="polite"
        className="min-w-[2.5rem] text-center text-base font-bold text-gray-900 select-none"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(Math.min(MAX_QTY, quantity + 1))}
        disabled={atMax}
        aria-label="Increase quantity"
        className={`${buttonBase} ${atMax ? buttonDisabled : buttonEnabled}`}
      >
        +
      </button>
    </div>
  )
}

function AddToCartButton({
  state,
  onClick,
}: {
  state: AddState
  onClick: () => void
}) {
  const base = 'w-full font-semibold py-3.5 rounded-xl transition text-base'
  if (state === 'success') {
    return (
      <button type="button" disabled className={`${base} bg-green-600 text-white`}>
        Added!
      </button>
    )
  }
  if (state === 'loading') {
    return (
      <button type="button" disabled className={`${base} bg-[#2d3ca5] text-white opacity-70 cursor-wait`}>
        Adding…
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} bg-[#2d3ca5] hover:bg-[#232f82] text-white`}
    >
      Add to Cart
    </button>
  )
}

export default function PackSelector({ product }: { product: any }) {
  const [selectedPack, setSelectedPack] = useState<PackSize>(1)
  const [quantity, setQuantity] = useState<number>(1)
  const [addState, setAddState] = useState<AddState>('idle')
  const [addError, setAddError] = useState<string | null>(null)

  const { addToCart, openDrawer } = useCart()

  const hasTierPricing =
    product.price_single != null &&
    product.price_3pack != null &&
    product.price_5pack != null

  const unitPrice = hasTierPricing
    ? ({ 1: product.price_single, 3: product.price_3pack, 5: product.price_5pack } as Record<PackSize, number>)[selectedPack]
    : Number(product.price)

  const total = unitPrice * quantity

  const handleAdd = async () => {
    if (addState === 'loading') return
    setAddError(null)
    setAddState('loading')
    try {
      await addToCart(product.id, selectedPack, quantity, unitPrice)
      setAddState('success')
      openDrawer()
      window.setTimeout(() => setAddState('idle'), 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add to cart.'
      setAddError(msg)
      setAddState('error')
      window.setTimeout(() => setAddState('idle'), 2500)
    }
  }

  if (!hasTierPricing) {
    return (
      <div>
        <span className="text-4xl font-extrabold text-[#2d3ca5] block mb-6">${total}</span>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Quantity</p>
        <QuantityStepper quantity={quantity} setQuantity={setQuantity} />
        <AddToCartButton state={addState} onClick={handleAdd} />
        {addError && <p className="mt-3 text-sm text-red-600">{addError}</p>}
      </div>
    )
  }

  const priceByPack: Record<PackSize, number> = {
    1: product.price_single,
    3: product.price_3pack,
    5: product.price_5pack,
  }

  const options: { size: PackSize; label: string }[] = [
    { size: 1, label: 'Single Vial' },
    { size: 3, label: '3-Pack' },
    { size: 5, label: '5-Pack' },
  ]

  return (
    <div>
      <span className="text-4xl font-extrabold text-[#2d3ca5] block mb-6">${total}</span>

      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Pack Size</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {options.map((opt) => {
          const isSelected = selectedPack === opt.size
          return (
            <button
              key={opt.size}
              type="button"
              onClick={() => setSelectedPack(opt.size)}
              className={
                isSelected
                  ? 'border-2 border-[#2d3ca5] bg-blue-50 rounded-xl px-4 py-3 text-center transition'
                  : 'border-2 border-gray-200 bg-white rounded-xl px-4 py-3 text-center transition hover:border-gray-300'
              }
            >
              <p
                className={
                  isSelected
                    ? 'text-sm font-bold text-[#2d3ca5]'
                    : 'text-sm font-bold text-gray-900'
                }
              >
                {opt.label}
              </p>
              <p
                className={
                  isSelected
                    ? 'text-base font-extrabold text-[#2d3ca5] mt-1'
                    : 'text-base font-extrabold text-gray-700 mt-1'
                }
              >
                ${priceByPack[opt.size]}
              </p>
            </button>
          )
        })}
      </div>

      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Quantity</p>
      <QuantityStepper quantity={quantity} setQuantity={setQuantity} />

      <AddToCartButton state={addState} onClick={handleAdd} />
      {addError && <p className="mt-3 text-sm text-red-600">{addError}</p>}
    </div>
  )
}
