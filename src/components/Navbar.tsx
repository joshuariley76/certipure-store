'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SearchBar from './SearchBar'
import { useCart } from '@/lib/use-cart'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/testing', label: 'Testing Results' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
]

export default function Navbar() {
  const { itemCount, openDrawer } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.reload()
  }

  const CartButton = (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`Open cart${itemCount > 0 ? `, ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
      className="relative flex items-center text-gray-600 hover:text-[#2d3ca5] transition"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-[#2d3ca5] text-white text-[10px] min-w-[1rem] h-4 px-1 rounded-full flex items-center justify-center font-bold">
          {itemCount}
        </span>
      )}
    </button>
  )

  return (
    <>
      <div className="bg-[#0f1540] text-white text-center py-1.5 px-4 text-xs font-medium tracking-wide">
        For Research Use Only
      </div>

      {/* Main bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <Link href="/" className="flex-shrink-0">
            <img src="/certipure-logo.jpg" alt="CertiPure" className="h-12 w-auto sm:h-16 md:h-20" />
          </Link>

          {/* Search: desktop only */}
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar />
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {CartButton}

            {/* Desktop account actions */}
            <Link href="/account/orders" className="hidden md:inline text-sm font-medium text-gray-600 hover:text-[#2d3ca5] transition">
              My Orders
            </Link>
            <button onClick={handleSignOut} className="hidden md:inline text-sm font-medium text-gray-600 hover:text-[#2d3ca5] transition">
              Sign Out
            </button>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="md:hidden text-gray-700 p-1"
            >
              {menuOpen ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop nav links row */}
      <div className="hidden md:block bg-[#1a1a2e] text-white">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-0">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="px-5 py-3 text-sm font-medium hover:bg-white/10 transition">
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#1a1a2e] text-white border-t border-white/10">
          <div className="px-4 py-3 border-b border-white/10">
            <SearchBar />
          </div>
          <nav className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3.5 text-sm font-medium hover:bg-white/10 transition border-b border-white/5"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/account/orders"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3.5 text-sm font-medium hover:bg-white/10 transition border-b border-white/5"
            >
              My Orders
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-3.5 text-left text-sm font-medium hover:bg-white/10 transition"
            >
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </>
  )
}
