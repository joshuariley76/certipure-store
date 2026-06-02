'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  sku: string | null
  stock_quantity: number | null
}

const LOW_STOCK_THRESHOLD = 5

export default function InventoryAdmin({ products }: { products: Product[] }) {
  const router = useRouter()
  // Edited values keyed by product id, kept as strings so the input can be
  // cleared while typing. Only products the admin actually changes get saved.
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function currentValue(p: Product) {
    if (edits[p.id] !== undefined) return edits[p.id]
    return p.stock_quantity != null ? String(p.stock_quantity) : '0'
  }

  // Rows where the typed value differs from the stored value and is a valid
  // whole number >= 0.
  function changedRows() {
    const out: { id: string; stock_quantity: number }[] = []
    for (const p of products) {
      const raw = edits[p.id]
      if (raw === undefined) continue
      const qty = Number(raw)
      const original = p.stock_quantity ?? 0
      if (raw.trim() === '' || !Number.isInteger(qty) || qty < 0) continue
      if (qty !== original) out.push({ id: p.id, stock_quantity: qty })
    }
    return out
  }

  const pending = changedRows()

  async function saveAll() {
    setError('')
    setMessage('')
    const updates = changedRows()
    if (updates.length === 0) {
      setMessage('No changes to save.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/update-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed.')
      setEdits({})
      setMessage(`Saved ${json.updated} product${json.updated === 1 ? '' : 's'}.`)
      router.refresh() // re-pull fresh stock numbers from the server
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const lowCount = products.filter((p) => (p.stock_quantity ?? 0) < LOW_STOCK_THRESHOLD).length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500">
              {products.length} products · {lowCount} low (below {LOW_STOCK_THRESHOLD})
            </p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-4 py-2 transition"
          >
            Sign out
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        {products.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl p-8 text-center">
            No products found.
          </p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Product Name</th>
                  <th className="px-5 py-3 font-semibold">SKU</th>
                  <th className="px-5 py-3 font-semibold text-center">Current Stock</th>
                  <th className="px-5 py-3 font-semibold text-center">New Qty</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = p.stock_quantity ?? 0
                  const isLow = stock < LOW_STOCK_THRESHOLD
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-gray-100 ${isLow ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.sku || '—'}</td>
                      <td className={`px-5 py-3 text-center font-bold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
                        {stock}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={currentValue(p)}
                          onChange={(e) =>
                            setEdits((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="w-24 text-center border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2d3ca5]/40 focus:border-[#2d3ca5]"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={saveAll}
            disabled={saving || pending.length === 0}
            className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-[#2d3ca5] text-white hover:bg-[#232f82] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving…' : 'Save All'}
          </button>
          <span className="text-sm text-gray-500">
            {pending.length === 0
              ? 'No unsaved changes'
              : `${pending.length} unsaved change${pending.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>
    </div>
  )
}
