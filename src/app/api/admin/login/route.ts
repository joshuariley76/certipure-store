import { NextResponse } from 'next/server'
import { verifyPassword, adminSessionToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: '' }))

  if (!process.env.ADMIN_KEY) {
    return NextResponse.json(
      { error: 'Admin password is not configured. Set ADMIN_KEY in .env.local.' },
      { status: 500 },
    )
  }

  if (!verifyPassword(password || '')) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, adminSessionToken()!, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return res
}
