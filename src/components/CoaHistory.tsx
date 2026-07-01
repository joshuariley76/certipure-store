'use client'

// COA history table with a per-product dropdown filter and a search box.
// Receives already-sorted rows (newest first) from the server page.
import { useMemo, useState } from 'react'

export type CoaRow = {
  id: string
  product: string
  slug: string
  size: string
  batch: string
  date: string
  net: string | null
  purity: string | null
  pdf: string | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Format a date-only string ("2026-06-29") deterministically — no timezone
// shifting, no locale-dependent hydration mismatch.
function fmtDate(d: string): string {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  if (!y || !m || !day) return d
  return `${MONTHS[m - 1]} ${day}, ${y}`
}

export default function CoaHistory({ rows }: { rows: CoaRow[] }) {
  const products = useMemo(
    () => Array.from(new Set(rows.map((r) => r.product))).sort((a, b) => a.localeCompare(b)),
    [rows],
  )
  const [product, setProduct] = useState('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (product !== 'all' && r.product !== product) return false
      if (q) {
        return (
          r.product.toLowerCase().includes(q) ||
          (r.batch || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [rows, product, query])

  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400">
        Our testing records are being updated. Please check back soon.
      </p>
    )
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="coa-product" className="text-xs font-semibold text-gray-500">
            Product
          </label>
          <select
            id="coa-product"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#2d3ca5] focus:outline-none focus:ring-1 focus:ring-[#2d3ca5]"
          >
            <option value="all">All products</option>
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product or batch #"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#2d3ca5] focus:outline-none focus:ring-1 focus:ring-[#2d3ca5] sm:w-64"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Batch #</th>
              <th className="px-4 py-3 font-semibold">Date Tested</th>
              <th className="px-4 py-3 font-semibold">Net Content</th>
              <th className="px-4 py-3 font-semibold">Purity</th>
              <th className="px-4 py-3 font-semibold">COA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">{r.product}</td>
                <td className="px-4 py-3 text-gray-600">{r.size || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.batch || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmtDate(r.date)}</td>
                <td className="px-4 py-3 text-gray-600">{r.net || '—'}</td>
                <td className="px-4 py-3 font-bold text-green-600">{r.purity || '—'}</td>
                <td className="px-4 py-3">
                  {r.pdf ? (
                    <a
                      href={r.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-[#2d3ca5] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#23306b]"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No results match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Showing {filtered.length} of {rows.length} tested batches. Newest results first.
      </p>
    </div>
  )
}
