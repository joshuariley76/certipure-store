'use client'

import { useMemo, useState } from 'react'

interface Product {
  id: string
  name: string
  is_active?: boolean
  price?: number | null
  price_single?: number | null
  price_3pack?: number | null
  price_5pack?: number | null
}

type Line = { product_id: string; pack_size: number; quantity: number }

const PACKS = [
  { size: 1, label: 'Single' },
  { size: 3, label: '3-Pack' },
  { size: 5, label: '5-Pack' },
]

function packPrice(p: Product | undefined, size: number): number | null {
  if (!p) return null
  if (size === 1) return Number(p.price_single ?? p.price ?? 0) || null
  if (size === 3) return Number(p.price_3pack) || null
  if (size === 5) return Number(p.price_5pack) || null
  return null
}

export default function InvoiceAdmin({ products }: { products: Product[] }) {
  const active = useMemo(
    () => products.filter((p) => p.is_active !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  )
  const pmap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const [lines, setLines] = useState<Line[]>([])
  const [pick, setPick] = useState('')
  const [pack, setPack] = useState(1)
  const [qty, setQty] = useState(1)
  const [customerEmail, setCustomerEmail] = useState('')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [payUrl, setPayUrl] = useState('')
  const [copied, setCopied] = useState(false)

  function addLine() {
    setError('')
    if (!pick) { setError('Choose a product first.'); return }
    if (packPrice(pmap.get(pick), pack) == null) { setError('That product has no price for the selected pack size.'); return }
    setLines((prev) => [...prev, { product_id: pick, pack_size: pack, quantity: qty }])
    setPick(''); setPack(1); setQty(1)
    setPayUrl('')
  }
  function removeLine(i: number) { setLines((prev) => prev.filter((_, idx) => idx !== i)); setPayUrl('') }

  const subtotal = lines.reduce((s, l) => s + (packPrice(pmap.get(l.product_id), l.pack_size) || 0) * l.quantity, 0)
  const shipping = subtotal >= 300 ? 0 : (lines.length ? 12.99 : 0)
  const total = subtotal + shipping

  async function createInvoice() {
    setError(''); setPayUrl('')
    if (lines.length === 0) { setError('Add at least one product.'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/create-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines, customerEmail: customerEmail.trim(), note: note.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Could not create invoice.'); setCreating(false); return }
      setPayUrl(json.payUrl)
    } catch { setError('Could not create invoice. Please try again.') }
    finally { setCreating(false) }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(payUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Invoice</h1>
        <p className="text-sm text-gray-500 mb-6">Build an order and get a payment link to send. The customer fills in shipping and pays by card, crypto, or Cash App.</p>

        {/* Add line */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_90px_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Product</label>
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Choose…</option>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Pack</label>
              <select value={pack} onChange={(e) => setPack(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                {PACKS.map((pk) => <option key={pk.size} value={pk.size}>{pk.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Qty</label>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center" />
            </div>
            <button type="button" onClick={addLine} className="bg-[#2d3ca5] hover:bg-[#232f82] text-white text-sm font-semibold px-4 py-2 rounded-lg">Add</button>
          </div>
        </div>

        {/* Lines */}
        {lines.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase"><th className="px-4 py-2">Product</th><th className="px-4 py-2">Pack</th><th className="px-4 py-2 text-center">Qty</th><th className="px-4 py-2 text-right">Line</th><th className="px-4 py-2"></th></tr></thead>
              <tbody>
                {lines.map((l, i) => {
                  const p = pmap.get(l.product_id)
                  const ppp = packPrice(p, l.pack_size) || 0
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium text-gray-900">{p?.name || '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{PACKS.find(x => x.size === l.pack_size)?.label}</td>
                      <td className="px-4 py-2 text-center">{l.quantity}</td>
                      <td className="px-4 py-2 text-right">${(ppp * l.quantity).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right"><button type="button" onClick={() => removeLine(i)} className="text-xs text-red-500 hover:underline">remove</button></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200"><td colSpan={3} className="px-4 py-2 text-right text-gray-500">Subtotal</td><td className="px-4 py-2 text-right">${subtotal.toFixed(2)}</td><td></td></tr>
                <tr><td colSpan={3} className="px-4 py-2 text-right text-gray-500">Shipping {shipping === 0 ? '(free)' : ''}</td><td className="px-4 py-2 text-right">${shipping.toFixed(2)}</td><td></td></tr>
                <tr className="border-t border-gray-200"><td colSpan={3} className="px-4 py-2 text-right font-bold">Total</td><td className="px-4 py-2 text-right font-bold text-[#2d3ca5]">${total.toFixed(2)}</td><td></td></tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Optional fields */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Customer email (optional — pre-fills their form)</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Internal note (optional — not shown to customer)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        {payUrl ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-green-800 mb-2">✓ Invoice created — send this link to your customer:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-xs font-mono break-all">{payUrl}</code>
              <button type="button" onClick={copyLink} className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <button type="button" onClick={() => { setLines([]); setCustomerEmail(''); setNote(''); setPayUrl('') }} className="mt-3 text-sm text-gray-500 underline hover:text-gray-800">Start another invoice</button>
          </div>
        ) : (
          <button type="button" onClick={createInvoice} disabled={creating || lines.length === 0} className="w-full bg-[#2d3ca5] hover:bg-[#232f82] disabled:opacity-40 text-white font-semibold py-3 rounded-xl">
            {creating ? 'Creating…' : 'Create Invoice & Get Link'}
          </button>
        )}
      </div>
    </div>
  )
}
