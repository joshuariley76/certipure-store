'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// One line item inside an order. `product_name_snapshot` is the product name as
// it was when the order was placed; `products` is the live product (used for
// linking back to the shop page if it still exists).
interface OrderItem {
  id: string
  product_name_snapshot: string
  pack_size: number
  quantity: number
  line_total: number
  products: { name: string; slug: string } | null
}

interface Order {
  id: string
  order_number: string
  status: string
  created_at: string
  order_total: number
  order_items: OrderItem[] | null
}

// Customer-facing colours + labels for each order status. Yellow = waiting on
// us to verify payment, blue = payment confirmed, green = shipped, gray =
// delivered or cancelled.
const STATUS_STYLES: Record<string, string> = {
  pending_verification: 'bg-amber-100 text-amber-800',
  verified: 'bg-blue-100 text-blue-800',
  shipped: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-200 text-gray-600',
  cancelled: 'bg-gray-200 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  pending_verification: 'Pending Verification',
  verified: 'Payment Verified',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function MyOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      // Only logged-in customers may see their orders.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
        return
      }

      // Pull this user's orders, newest first, with their items and (where the
      // product still exists) the live product name + slug for linking.
      const { data, error: queryError } = await supabase
        .from('orders')
        .select(
          'id, order_number, status, created_at, order_total, order_items(id, product_name_snapshot, pack_size, quantity, line_total, products(name, slug))',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!active) return

      if (queryError) {
        setError('We could not load your orders. Please try again later.')
      } else {
        setOrders((data as unknown as Order[]) || [])
      }
      setIsLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [router])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-400">
          Loading your orders…
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Orders</h1>
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        </div>
      </main>
    )
  }

  if (orders.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">No orders yet</h1>
          <p className="text-gray-500 text-sm mb-6">
            When you place an order it will show up here so you can track it.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold text-sm px-8 py-3 rounded-full transition"
          >
            Browse the Shop
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">My Orders</h1>
        <p className="text-sm text-gray-500 mb-8">
          {orders.length === 1 ? '1 order' : `${orders.length} orders`}
        </p>

        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-900">
                      {order.order_number}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Placed {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-[#2d3ca5]">
                    ${Number(order.order_total).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Order total</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-semibold text-gray-700 text-sm mb-2">Items</h3>
                <ul className="space-y-1.5">
                  {(order.order_items || []).map((item) => {
                    const name = item.product_name_snapshot || item.products?.name || 'Item'
                    const packLabel =
                      item.pack_size === 1 ? 'Single' : `${item.pack_size}-Pack`
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between text-sm gap-3"
                      >
                        <span className="text-gray-700">
                          {item.products?.slug ? (
                            <Link
                              href={`/product/${item.products.slug}`}
                              className="hover:text-[#2d3ca5] transition"
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}{' '}
                          <span className="text-gray-400">
                            ({packLabel} ×{item.quantity})
                          </span>
                        </span>
                        <span className="text-gray-600 whitespace-nowrap">
                          ${Number(item.line_total).toFixed(2)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
