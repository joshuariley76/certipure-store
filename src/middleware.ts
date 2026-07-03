import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Expose the current path to server components (the root layout reads this to
// decide whether the signup gate should apply). Header-only; does not touch
// cookies or auth.
export function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', req.nextUrl.pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
