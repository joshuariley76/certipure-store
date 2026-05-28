'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type SearchResult = {
  id: string
  name: string
  slug: string
  size: string | null
  unit: string | null
  price: number | null
  price_single: number | null
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const handle = setTimeout(async () => {
      const safe = trimmed.replace(/[%_,()\\]/g, '')
      if (!safe) {
        setResults([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, size, unit, price, price_single')
        .eq('is_active', true)
        .or(`name.ilike.%${safe}%,short_description.ilike.%${safe}%`)
        .limit(8)
      if (error) {
        console.error('Search error:', error.message)
        setResults([])
      } else {
        setResults(data || [])
      }
      setOpen(true)
      setLoading(false)
    }, 250)

    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const trimmed = query.trim()
  const showPanel = open && trimmed.length > 0

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (trimmed.length > 0) setOpen(true)
        }}
        placeholder="Search products..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#2d3ca5] transition pr-10"
      />
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>

      {showPanel && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">No products found</div>
          ) : (
            <ul>
              {results.map((p) => {
                const startingPrice = p.price_single ?? p.price
                return (
                  <li key={p.id}>
                    <Link
                      href={`/product/${p.slug}`}
                      onClick={() => {
                        setOpen(false)
                        setQuery('')
                      }}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        {(p.size || p.unit) && (
                          <p className="text-xs text-gray-400">
                            {p.size}
                            {p.unit}
                          </p>
                        )}
                      </div>
                      {startingPrice != null && (
                        <span className="text-sm font-bold text-[#2d3ca5] flex-shrink-0">
                          ${startingPrice}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
