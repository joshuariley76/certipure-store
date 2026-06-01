'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SearchBar from './SearchBar'
import { useCart } from '@/lib/use-cart'

export default function Navbar() {
  const { itemCount, openDrawer } = useCart()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <>
      <div className="bg-[#0f1540] text-white text-center py-1.5 px-4 text-xs font-medium tracking-wide">
        For Research Use Only
      </div>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-6">
          <Link href="/" className="flex-shrink-0">
            <img src="/certipure-logo.jpg" alt="CertiPure" className="h-20 w-auto" />
          </Link>
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar />
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              type="button"
              onClick={openDrawer}
              aria-label={`Open cart${itemCount > 0 ? `, ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
              className="flex items-center gap-1.5 text-gray-600 hover:text-[#2d3ca5] transition relative"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#2d3ca5] text-white text-[10px] min-w-[1rem] h-4 px-1 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </button>
            <Link
              href="/account/orders"
              className="text-sm font-medium text-gray-600 hover:text-[#2d3ca5] transition"
            >
              My Orders
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-gray-600 hover:text-[#2d3ca5] transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      <div className="bg-[#1a1a2e] text-white">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-0">
          <Link href="/" className="px-5 py-3 text-sm font-medium hover:bg-white/10 transition">Home</Link>
          <Link href="/shop" className="px-5 py-3 text-sm font-medium hover:bg-white/10 transition">Shop</Link>
          <Link href="/testing" className="px-5 py-3 text-sm font-medium hover:bg-white/10 transition">Testing Results</Link>
          <Link href="/about" className="px-5 py-3 text-sm font-medium hover:bg-white/10 transition">About Us</Link>
          <Link href="/contact" className="px-5 py-3 text-sm font-medium hover:bg-white/10 transition">Contact Us</Link>
        </div>
      </div>
    </>
  )
}
