import crypto from 'crypto'
import { cookies } from 'next/headers'

// Name of the cookie that marks a browser as logged into the admin area.
export const ADMIN_COOKIE = 'cp_admin'

// The session token is derived from your ADMIN_KEY, so a valid cookie cannot be
// forged without knowing the password. The password itself is never stored in
// the cookie.
function deriveToken(secret: string): string {
  return crypto.createHmac('sha256', secret).update('certipure-admin-session').digest('hex')
}

export function adminSessionToken(): string | null {
  const key = process.env.ADMIN_KEY
  if (!key) return null
  return deriveToken(key)
}

// Constant-time string comparison to avoid leaking length/contents via timing.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function verifyPassword(password: string): boolean {
  const key = process.env.ADMIN_KEY
  if (!key) return false
  return safeEqual(password, key)
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = adminSessionToken()
  if (!token) return false
  const store = await cookies()
  const cookie = store.get(ADMIN_COOKIE)?.value
  if (!cookie) return false
  return safeEqual(cookie, token)
}
