'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Affiliate {
  id: string
  code: string
  name: string
  email: string | null
  discount_percent: number
  commission_percent: number
  is_active: boolean
  created_at: string
  stat: { orders: number; sales: number; commission: number }
}

const money = (n: number) => `$${n.toFixed(2)}`

export default function AffiliatesAdmin({ affiliates }: { affiliates: Affiliate[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ code: '', name: '', email: '', discount_percent: '10', commission_percent: '10' })

  const totalOwed = affiliates.reduce((s, a) => s + a.stat.commission, 0)

  async function addAffiliate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          email: form.email || null,
          discount_percent: Number(form.discount_percent),
          commission_percent: Number(form.commission_percent),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create affiliate.')
      setForm({ code: '', name: '', email: '', discount_percent: '10', commission_percent: '10' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(a: Affiliate) {
    setBusy(true)
    try {
      await fetch('/api/admin/affiliates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, is_active: !a.is_active }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Affiliates</h1>
            <p className="text-sm text-gray-500">Discount codes, tracking, and commission owed.</p>
          </div>
          <Link href="/admin/orders" className="text-sm font-semibold text-[#2d3ca5] hover:underline">
            ← Orders
          </Link>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Affiliates</p>
            <p className="text-2xl font-bold text-gray-900">{affiliates.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Active</p>
            <p className="text-2xl font-bold text-gray-900">{affiliates.filter((a) => a.is_active).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Commission owed</p>
            <p className="text-2xl font-bold text-[#2d3ca5]">{money(totalOwed)}</p>
          </div>
        </div>

        {/* Add form */}
        <form onSubmit={addAffiliate} className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Add an affiliate code</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="JAKE10"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Affiliate name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jake Smith"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jake@email.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Discount %</label>
              <input
                type="number" min="0" max="100"
                value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Commission %</label>
              <input
                type="number" min="0" max="100"
                value={form.commission_percent}
                onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 bg-[#2d3ca5] hover:bg-[#232f82] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
          >
            {busy ? 'Saving…' : 'Add affiliate'}
          </button>
        </form>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Affiliate</th>
                  <th className="px-5 py-3">Disc / Comm</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3">Sales</th>
                  <th className="px-5 py-3">Commission owed</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No affiliates yet.</td></tr>
                )}
                {affiliates.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-5 py-3 font-mono font-bold text-[#2d3ca5]">{a.code}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{a.name}</div>
                      {a.email && <div className="text-xs text-gray-400">{a.email}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{a.discount_percent}% / {a.commission_percent}%</td>
                    <td className="px-5 py-3 text-gray-900">{a.stat.orders}</td>
                    <td className="px-5 py-3 text-gray-900">{money(a.stat.sales)}</td>
                    <td className="px-5 py-3 font-bold text-gray-900">{money(a.stat.commission)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleActive(a)}
                        disabled={busy}
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          a.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {a.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Commission owed counts orders that reached payment-verified or later. Cancelled and
          unverified orders are excluded.
        </p>
      </div>
    </div>
  )
}
