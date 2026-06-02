'use client'

import { useState } from 'react'
import OrdersAdmin from './OrdersAdmin'
import InventoryAdmin from './InventoryAdmin'

interface Product {
  id: string
  name: string
  sku: string | null
  stock_quantity: number | null
}

type Tab = 'orders' | 'inventory'

export default function AdminDashboard({
  orders,
  products,
}: {
  orders: any[]
  products: Product[]
}) {
  const [tab, setTab] = useState<Tab>('orders')

  const tabClass = (active: boolean) =>
    `px-5 py-3 text-sm font-semibold border-b-2 transition ${
      active
        ? 'border-[#2d3ca5] text-[#2d3ca5]'
        : 'border-transparent text-gray-500 hover:text-gray-800'
    }`

  return (
    <div className="bg-gray-50">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-2">
          <button onClick={() => setTab('orders')} className={tabClass(tab === 'orders')}>
            Orders
          </button>
          <button onClick={() => setTab('inventory')} className={tabClass(tab === 'inventory')}>
            Inventory
          </button>
        </div>
      </div>

      {tab === 'orders' ? (
        <OrdersAdmin orders={orders} />
      ) : (
        <InventoryAdmin products={products} />
      )}
    </div>
  )
}
