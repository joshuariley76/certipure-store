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
  pending_verification: 'bg-amber-100 text-amber-800',
  payment_verified: 'bg-blue-100 text-blue-800',
  verified: 'bg-blue-100 text-blue-800', // legacy orders saved before the rename
  shipped: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
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

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const pendingCount = orders.filter((o) => o.status === 'pending_verification').length

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
                      <p className="text-xs text-gray-500">Paid in {order.crypto_coin || '—'}</p>
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
