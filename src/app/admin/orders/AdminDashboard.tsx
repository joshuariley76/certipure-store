'use client'

import { useState } from 'react'
import OrdersAdmin from './OrdersAdmin'
import InventoryAdmin from './InventoryAdmin'
import InvoiceAdmin from './InvoiceAdmin'

interface Product {
  id: string
  name: string
  sku: string | null
  stock_quantity: number | null
  is_active?: boolean
  price?: number | null
  price_single?: number | null
  price_3pack?: number | null
  price_5pack?: number | null
}

type Tab = 'orders' | 'inventory' | 'invoices'

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
          <button onClick={() => setTab('invoices')} className={tabClass(tab === 'invoices')}>
            Invoices
          </button>
        </div>
      </div>

      {tab === 'orders' ? (
        <OrdersAdmin orders={orders} />
      ) : tab === 'inventory' ? (
        <InventoryAdmin products={products} />
      ) : (
        <InvoiceAdmin products={products} />
      )}
    </div>
  )
}
