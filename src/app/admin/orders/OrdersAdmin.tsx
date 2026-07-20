'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OrderItem {
  product_name_snapshot: string
  pack_size: number
  quantity: number
  line_total: number
}

interface Order {
  id: string
  order_number: string
  status: string
  created_at: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  crypto_coin: string | null
  order_total: number
  shipping_address: { line1?: string; line2?: string | null; city?: string; state?: string; zip?: string } | null
  order_items: OrderItem[] | null
  screenshotUrl: string | null
  tracking_number: string | null
  carrier: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'bg-gray-100 text-gray-500', // card order created, awaiting PayRio payment
  pending_verification: 'bg-amber-100 text-amber-800',
  payment_verified: 'bg-blue-100 text-blue-800',
  verified: 'bg-blue-100 text-blue-800', // legacy orders saved before the rename
  shipped: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting card payment',
  pending_verification: 'Pending verification',
  payment_verified: 'Verified',
  verified: 'Verified', // legacy orders saved before the rename
  shipped: 'Shipped',
  cancelled: 'Cancelled',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function OrdersAdmin({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function updateStatus(
    orderId: string,
    status: string,
    extra?: { trackingNumber?: string; carrier?: string },
  ) {
    setBusyId(orderId)
    setError('')
    try {
      const res = await fetch('/api/admin/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, ...extra }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Update failed.')
      }
      router.refresh() // re-fetch the server data so the new status shows
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setBusyId(null)
    }
  }

  // --- Shipping labels (Shippo) --------------------------------------------
  // Flow: open the panel on an order -> set weight/size -> review rates ->
  // pick one -> buy. Buying spends real postage (unless on a test token), so it
  // only happens on an explicit click.
  type Rate = { id: string; provider: string; service: string; amount: string; estimatedDays: number | null }
  const [labelFor, setLabelFor] = useState<string | null>(null)
  const [weightOz, setWeightOz] = useState('8')
  const [dims, setDims] = useState({ length: '6', width: '9', height: '2' })
  const [rates, setRates] = useState<Rate[]>([])
  const [pickedRate, setPickedRate] = useState('')
  const [rateBusy, setRateBusy] = useState(false)
  const [labelMsg, setLabelMsg] = useState('')
  const [labelErr, setLabelErr] = useState('')
  const [testMode, setTestMode] = useState(false)

  function openLabelPanel(orderId: string) {
    setLabelFor(labelFor === orderId ? null : orderId)
    setRates([]); setPickedRate(''); setLabelErr(''); setLabelMsg('')
  }

  async function loadRates(orderId: string) {
    setRateBusy(true); setLabelErr(''); setLabelMsg(''); setRates([]); setPickedRate('')
    try {
      const res = await fetch('/api/admin/shipping/rates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, weightOz: Number(weightOz), ...dims }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not get rates.')
      setRates(json.rates || [])
      setTestMode(Boolean(json.testMode))
      if (json.rates?.length) setPickedRate(json.rates[0].id)
      else setLabelErr('No shipping options came back for that address/size.')
    } catch (e) {
      setLabelErr(e instanceof Error ? e.message : 'Could not get rates.')
    } finally { setRateBusy(false) }
  }

  async function buyAndPrint(orderId: string) {
    const rate = rates.find((r) => r.id === pickedRate)
    if (!rate) { setLabelErr('Pick a shipping option first.'); return }
    setRateBusy(true); setLabelErr(''); setLabelMsg('')
    try {
      const res = await fetch('/api/admin/shipping/buy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rateId: pickedRate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not buy the label.')
      // Open the printable label immediately.
      if (json.labelUrl) window.open(json.labelUrl, '_blank', 'noopener')
      // Mark shipped + save tracking + email the customer (existing flow).
      await updateStatus(orderId, 'shipped', {
        carrier: rate.provider,
        trackingNumber: json.trackingNumber,
      })
      setLabelMsg(`Label bought — ${rate.provider} ${rate.service}, tracking ${json.trackingNumber}. Customer emailed.`)
      setRates([])
    } catch (e) {
      setLabelErr(e instanceof Error ? e.message : 'Could not buy the label.')
    } finally { setRateBusy(false) }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const pendingCount = orders.filter((o) => o.status === 'pending_verification').length

  // "Ready to ship" = paid and verified but not yet shipped. Includes the legacy
  // 'verified' status (same meaning, used before the payment_verified rename).
  const readyToShip = orders.filter(
    (o) => o.status === 'payment_verified' || o.status === 'verified',
  )
  const readyCount = readyToShip.length

  // Build a Pirate Ship batch-import CSV from the ready-to-ship orders and
  // trigger a download. Columns and order are Pirate Ship's required format.
  function exportPirateshipCsv() {
    const headers = [
      'Name', 'Company', 'Address 1', 'Address 2', 'City', 'State', 'Zip',
      'Country', 'Weight (oz)', 'Length', 'Width', 'Height', 'Service', 'Package Type',
    ]
    // Quote every cell and escape embedded quotes, so commas in addresses are safe.
    const cell = (v: string | number | null | undefined) =>
      `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`

    const rows = readyToShip.map((o) => {
      const a = o.shipping_address || {}
      return [
        o.customer_name || '', // Name (stored on the order, not in shipping_address)
        '',                    // Company — blank
        a.line1 || '',         // Address 1
        a.line2 || '',         // Address 2
        a.city || '',          // City
        a.state || '',         // State
        a.zip || '',           // Zip
        'US',                  // Country
        4,                     // Weight (oz) — default; Josh adjusts in Pirate Ship
        6,                     // Length
        9,                     // Width
        2,                     // Height
        '',                    // Service — blank
        '',                    // Package Type — blank
      ].map(cell).join(',')
    })

    const csv = [headers.map(cell).join(','), ...rows].join('\r\n')
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pirateship-orders-${today}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500">
              {orders.length} total · {pendingCount} awaiting verification
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <button
                onClick={exportPirateshipCsv}
                disabled={readyCount === 0}
                className="text-sm font-semibold bg-[#2d3ca5] hover:bg-[#23306b] text-white rounded-lg px-4 py-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ⬇ Export to Pirateship CSV
              </button>
              <span className="text-xs text-gray-500 mt-1">
                {readyCount} {readyCount === 1 ? 'order' : 'orders'} ready to ship
              </span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-4 py-2 transition"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {orders.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl p-8 text-center">
            No orders yet.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const addr = order.shipping_address
              const busy = busyId === order.id
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-gray-900">{order.order_number}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
                      {(order.tracking_number || order.carrier) && (
                        <p className="text-xs text-gray-600 mt-1">
                          📦 {order.carrier || 'Carrier'} ·{' '}
                          <span className="font-mono">{order.tracking_number || '—'}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-blue-600">${Number(order.order_total).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{order.crypto_coin === 'CASHAPP' ? 'Paid via Cash App' : `Paid in ${order.crypto_coin || '—'}`}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer + shipping */}
                    <div className="md:col-span-1 text-sm">
                      <h3 className="font-semibold text-gray-700 mb-1">Customer</h3>
                      <p className="text-gray-600">{order.customer_name}</p>
                      <p className="text-gray-600 break-all">{order.customer_email}</p>
                      <p className="text-gray-600">{order.customer_phone || 'No phone'}</p>
                      {addr && (
                        <>
                          <h3 className="font-semibold text-gray-700 mt-3 mb-1">Ship to</h3>
                          <p className="text-gray-600">
                            {addr.line1}
                            {addr.line2 ? <>, {addr.line2}</> : null}
                            <br />
                            {addr.city}, {addr.state} {addr.zip}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Items */}
                    <div className="md:col-span-1 text-sm">
                      <h3 className="font-semibold text-gray-700 mb-1">Items</h3>
                      <ul className="space-y-1">
                        {(order.order_items || []).map((it, i) => (
                          <li key={i} className="text-gray-600">
                            {it.product_name_snapshot}{' '}
                            <span className="text-gray-400">
                              ({it.pack_size === 1 ? 'Single' : `${it.pack_size}-Pack`} ×{it.quantity})
                            </span>{' '}
                            — ${Number(it.line_total).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Screenshot */}
                    <div className="md:col-span-1">
                      <h3 className="font-semibold text-gray-700 mb-1 text-sm">Payment screenshot</h3>
                      {order.screenshotUrl ? (
                        <a href={order.screenshotUrl} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={order.screenshotUrl}
                            alt="Payment screenshot"
                            className="max-h-40 rounded-lg border border-gray-200 hover:opacity-90 transition"
                          />
                          <span className="text-xs text-blue-600">Open full size →</span>
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">No screenshot</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(order.id, 'payment_verified')}
                      disabled={busy || order.status === 'payment_verified'}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Mark Verified
                    </button>
                    <button
                      onClick={() => {
                        const carrier = window.prompt('Carrier (e.g. USPS, UPS, FedEx, DHL):', '')
                        if (carrier === null) return // cancelled
                        const trackingNumber = window.prompt('Tracking number:', '')
                        if (trackingNumber === null) return // cancelled
                        updateStatus(order.id, 'shipped', {
                          carrier: carrier.trim(),
                          trackingNumber: trackingNumber.trim(),
                        })
                      }}
                      disabled={busy || order.status === 'shipped'}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Mark Shipped
                    </button>
                    <button
                      onClick={() => openLabelPanel(order.id)}
                      disabled={busy}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#2d3ca5] text-white hover:bg-[#232f82] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {labelFor === order.id ? 'Close Label' : '🏷️ Buy Label'}
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      disabled={busy || order.status === 'cancelled'}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Cancel
                    </button>
                    {order.status !== 'pending_verification' && (
                      <button
                        onClick={() => updateStatus(order.id, 'pending_verification')}
                        disabled={busy}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                      >
                        Reset to Pending
                      </button>
                    )}
                  </div>

                  {/* Shipping label panel */}
                  {labelFor === order.id && (
                    <div className="mt-4 p-4 rounded-xl border border-[#2d3ca5]/30 bg-blue-50/40">
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Weight (oz)</label>
                          <input type="number" min={1} step="0.1" value={weightOz} onChange={(e) => setWeightOz(e.target.value)}
                            className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right bg-white" />
                        </div>
                        {(['length', 'width', 'height'] as const).map((d) => (
                          <div key={d}>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1 capitalize">{d} (in)</label>
                            <input type="number" min={1} value={dims[d]} onChange={(e) => setDims((p) => ({ ...p, [d]: e.target.value }))}
                              className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right bg-white" />
                          </div>
                        ))}
                        <button type="button" onClick={() => loadRates(order.id)} disabled={rateBusy}
                          className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#2d3ca5] text-white hover:bg-[#232f82] disabled:opacity-40">
                          {rateBusy ? 'Working…' : 'Review Shipping Options'}
                        </button>
                      </div>

                      {rates.length > 0 && (
                        <div className="mt-4">
                          {testMode && (
                            <p className="mb-2 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-1 inline-block">
                              TEST MODE — no real postage is purchased
                            </p>
                          )}
                          <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {rates.map((r) => (
                              <label key={r.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 bg-white cursor-pointer ${pickedRate === r.id ? 'border-[#2d3ca5]' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input type="radio" name={`rate-${order.id}`} checked={pickedRate === r.id} onChange={() => setPickedRate(r.id)} />
                                <span className="flex-1 text-sm">
                                  <span className="font-semibold text-gray-900">{r.provider} {r.service}</span>
                                  {r.estimatedDays != null && <span className="text-gray-500"> · {r.estimatedDays} day{r.estimatedDays === 1 ? '' : 's'}</span>}
                                </span>
                                <span className="font-bold text-[#2d3ca5]">${r.amount}</span>
                              </label>
                            ))}
                          </div>
                          <button type="button" onClick={() => buyAndPrint(order.id)} disabled={rateBusy || !pickedRate}
                            className="mt-3 w-full text-sm font-bold px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
                            {rateBusy ? 'Buying…' : 'Buy Label & Print'}
                          </button>
                          <p className="mt-1.5 text-[11px] text-gray-500">Buys the selected rate, opens the label PDF to print, marks the order shipped, and emails the customer their tracking.</p>
                        </div>
                      )}

                      {labelErr && <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{labelErr}</p>}
                      {labelMsg && <p className="mt-3 text-xs text-green-800 bg-green-50 border border-green-200 rounded px-3 py-2">{labelMsg}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
