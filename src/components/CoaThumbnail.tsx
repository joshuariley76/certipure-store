'use client'

// Renders the FIRST PAGE of a COA PDF as a small clickable image, using
// pdf.js entirely in the browser (no server/storage work needed). Clicking
// opens the full PDF in a new tab. If anything fails (network/CORS/parse),
// the component renders nothing so the page's "View Certificate of Analysis"
// button remains the reliable way in. Optional `caption` labels which batch
// this COA is (used when several COAs are shown side by side).
import { useEffect, useRef, useState } from 'react'

export default function CoaThumbnail({
  pdfUrl,
  caption,
}: {
  pdfUrl: string
  caption?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        // Worker is loaded from a CDN pinned to the exact installed version.
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        // disableStream/Range -> one plain cross-origin GET (no CORS preflight).
        const pdf = await pdfjs.getDocument({
          url: pdfUrl,
          disableStream: true,
          disableRange: true,
        }).promise
        const page = await pdf.getPage(1)
        const canvas = canvasRef.current
        if (!canvas || cancelled) return
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        const targetCssWidth = 360
        const base = page.getViewport({ scale: 1 })
        const scale = (targetCssWidth / base.width) * dpr
        const viewport = page.getViewport({ scale })
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = '100%'
        canvas.style.height = 'auto'
        await page.render({ canvasContext: ctx, viewport }).promise
        if (!cancelled) setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pdfUrl])

  if (state === 'error') return null

  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Open the full Certificate of Analysis (PDF)"
      className="group block rounded-2xl border border-gray-200 bg-white p-3 hover:border-[#2d3ca5] hover:shadow-md transition"
    >
      {caption && (
        <span className="mb-2 block text-center text-[11px] font-semibold text-gray-600">
          {caption}
        </span>
      )}
      <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ display: state === 'ready' ? 'block' : 'none' }}
        />
        {state === 'loading' && (
          <div className="flex h-48 items-center justify-center text-xs text-gray-400">
            Loading COA preview…
          </div>
        )}
      </div>
      <span className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#2d3ca5]">
        View full COA (PDF)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7m0 0v7m0-7L10 14M19 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h5" />
        </svg>
      </span>
    </a>
  )
}
