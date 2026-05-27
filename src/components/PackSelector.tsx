'use client'

import { useState } from 'react'

type PackSize = 1 | 3 | 5

export default function PackSelector({ product }: { product: any }) {
  const [selectedPack, setSelectedPack] = useState<PackSize>(1)

  const hasTierPricing =
    product.price_single != null &&
    product.price_3pack != null &&
    product.price_5pack != null

  if (!hasTierPricing) {
    return (
      <div>
        <span className="text-4xl font-extrabold text-[#2d3ca5] block mb-6">${product.price}</span>
        <button className="w-full bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold py-3.5 rounded-xl transition text-base">
          Add to Cart
        </button>
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
      <span className="text-4xl font-extrabold text-[#2d3ca5] block mb-6">
        ${priceByPack[selectedPack]}
      </span>

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

      <button
        type="button"
        data-pack-size={selectedPack}
        className="w-full bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold py-3.5 rounded-xl transition text-base"
      >
        Add to Cart
      </button>
    </div>
  )
}
