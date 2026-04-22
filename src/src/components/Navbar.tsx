'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-context'

export default function Navbar() {
  const { totalItems } = useCart()

  return (
    <>
      <div className="bg-[#0f1540] text-white text-center py-2 px-4 text-xs font-medium tracking-wide">
        <span className="font-bold">Free Shipping</span> on orders over $200 &nbsp;•&nbsp; Same-day shipping before 1PM EST
      </div>
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="#1a1a2e"/>
              <path d="M25.5 13C23.5 10.8 20.8 9.5 17.8 9.5C12.2 9.5 7.8 14 7.8 20C7.8 26 12.2 30.5 17.8 30.5C20.8 30.5 23.5 29.2 25.5 27" stroke="white" strokeWidth="3.8" strokeLinecap="round" fill="none"/>
            </svg>
            <span className="text-xl font-extrabold text-gray-900 tracking-tight">CertiPure</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-gray-600">
            <Link href="/shop" className="hover:text-[#2d3ca5] transition">Shop Peptides</Link>
            <Link href="/testing" className="hover:text-[#2d3ca5] transition">Lab Results & COAs</Link>
            <Link href="/about" className="hover:text-[#2d3ca5] transition">About</Link>
            <Link href="/contact" className="hover:text-[#2d3ca5] transition">Contact</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/shop" className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </Link>
            <Link href="/cart" className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition text-gray-500 relative">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#2d3ca5] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{totalItems}</span>
              )}
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}
