// The line under a water product's price: it costs less when it isn't bought
// on its own. Shown on the catalog card, the carousel card and the product
// page, so the offer is visible before anyone reaches the cart.
//
// The numbers come from lib/water-pricing.ts — the same module the cart and
// the order API use — so this can never advertise a price checkout won't give.

import { WATER_PRICE_WITH_ORDER } from '@/lib/water-pricing'

export default function WaterAddOnNote({ full = false }: { full?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-[#f4c6d8] bg-[#fdeef4] text-[#8d2049] font-semibold leading-snug ${
        full ? 'mt-4 max-w-sm px-3.5 py-2.5 text-sm' : 'mt-2 px-2.5 py-1.5 text-[11px]'
      }`}
    >
      <span className="text-[#a3184f] font-extrabold">${WATER_PRICE_WITH_ORDER} each</span>{' '}
      when added to any peptide order — single vial or pack.
      {full && (
        <span className="block font-normal mt-0.5 text-[#8d2049]/80">
          The discount is applied automatically in your cart.
        </span>
      )}
    </div>
  )
}
