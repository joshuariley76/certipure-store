// A branded "vial label" rendered entirely in CSS/SVG — no image file needed.
// Used in place of the product photo on cards and the product detail page.
//
// Visual: light blue-grey gradient with a faint molecular pattern, the
// CertiPure wordmark up top, a navy badge with the product name, a grey pill
// with the dosage, and a navy "FOR RESEARCH USE ONLY" bar across the bottom.

export default function ProductLabel({
  name,
  strength,
}: {
  name: string
  strength?: string
}) {
  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden rounded-xl flex flex-col select-none border border-gray-200"
      style={{
        background:
          'radial-gradient(circle at 18% 18%, #eaf0f9 0%, rgba(234,240,249,0) 45%),' +
          'radial-gradient(circle at 82% 26%, #dfe8f4 0%, rgba(223,232,244,0) 42%),' +
          'linear-gradient(135deg, #f5f8fc 0%, #e5ecf6 100%)',
      }}
    >
      {/* Decorative molecular structure — subtle nodes + bonds */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 260"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g stroke="#b7c6e2" strokeWidth="1.2" fill="none" opacity="0.6">
          <line x1="26" y1="58" x2="58" y2="42" />
          <line x1="58" y1="42" x2="76" y2="72" />
          <line x1="76" y1="72" x2="42" y2="90" />
          <line x1="42" y1="90" x2="26" y2="58" />
          <line x1="150" y1="36" x2="174" y2="62" />
          <line x1="174" y1="62" x2="158" y2="94" />
          <line x1="158" y1="94" x2="128" y2="80" />
          <line x1="128" y1="80" x2="150" y2="36" />
          <line x1="34" y1="206" x2="64" y2="220" />
          <line x1="64" y1="220" x2="52" y2="188" />
          <line x1="150" y1="210" x2="176" y2="196" />
          <line x1="176" y1="196" x2="170" y2="226" />
        </g>
        <g fill="#aebfdc" opacity="0.55">
          <circle cx="26" cy="58" r="4" />
          <circle cx="58" cy="42" r="5" />
          <circle cx="76" cy="72" r="4" />
          <circle cx="42" cy="90" r="3.5" />
          <circle cx="150" cy="36" r="4.5" />
          <circle cx="174" cy="62" r="4" />
          <circle cx="158" cy="94" r="5" />
          <circle cx="128" cy="80" r="3.5" />
          <circle cx="34" cy="206" r="4" />
          <circle cx="64" cy="220" r="5" />
          <circle cx="52" cy="188" r="3.5" />
          <circle cx="150" cy="210" r="4" />
          <circle cx="176" cy="196" r="4.5" />
          <circle cx="170" cy="226" r="3.5" />
        </g>
      </svg>

      {/* Foreground content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-4">
        {/* Wordmark */}
        <div className="text-xl font-extrabold tracking-tight leading-none">
          <span style={{ color: '#0f1540' }}>Certi</span>
          <span style={{ color: '#8593b8' }}>PURE</span>
        </div>

        {/* Product name badge + dosage pill, centered in the remaining space */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 w-full py-4">
          <div className="bg-[#0f1540] text-white font-bold text-center rounded-xl px-5 py-2.5 max-w-[92%] text-sm leading-tight shadow-sm break-words">
            {name}
          </div>
          {strength ? (
            <div className="bg-[#dde4f0] text-[#0f1540] font-semibold rounded-full px-5 py-1.5 text-xs tracking-wide">
              {strength}
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom compliance bar */}
      <div className="relative z-10 bg-[#0f1540] text-white text-center font-bold tracking-[0.18em] text-[11px] py-2.5">
        FOR RESEARCH USE ONLY
      </div>
    </div>
  )
}

// Derive the label's { name, strength } from a product row. Strips a trailing
// "(...)" dosage that's sometimes baked into the name (e.g. "GHK-Cu (100mg)"),
// and takes the strength from the size + unit columns, falling back to a name
// parenthetical, and omitting it entirely when there's nothing to show.
export function productLabelProps(product: {
  name?: string | null
  size?: string | number | null
  unit?: string | null
}): { name: string; strength: string } {
  const rawName = (product?.name ?? '').trim()
  const name = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawName

  let strength = ''
  const hasSize = product?.size != null && String(product.size).trim() !== ''
  if (hasSize) {
    strength = `${product.size}${product.unit || ''}`
  } else {
    const m = rawName.match(/\(([^)]*)\)\s*$/)
    if (m) strength = m[1].trim()
  }
  return { name, strength }
}
