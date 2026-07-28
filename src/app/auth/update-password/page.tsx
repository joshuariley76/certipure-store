'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Where a customer lands after clicking the "reset your password" link in their
// email. The /auth/callback route has already exchanged the recovery code for a
// session, so the user is signed in here just long enough to set a new password.
export default function UpdatePasswordPage() {
  const supabase = createClient()

  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Confirm the recovery session exists before showing the form. Also listen
    // for the PASSWORD_RECOVERY event in case the session lands a beat later.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session))
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <Image src="/certipure-logo.jpg" alt="CertiPure" width={280} height={90} priority className="h-auto w-auto max-h-20" />
        </div>

        {!ready ? (
          <p className="text-center text-sm text-gray-500">Loading…</p>
        ) : done ? (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Password updated</h1>
            <p className="mb-6 text-sm text-gray-600">Your new password is saved. You can now use it to sign in.</p>
            <Link href="/shop" className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
              Continue to shop
            </Link>
          </div>
        ) : !hasSession ? (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Link expired</h1>
            <p className="mb-6 text-sm text-gray-600">
              This password-reset link is invalid or has expired. Please request a new one from the sign-in screen.
            </p>
            <Link href="/?signin=1" className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">Set a new password</h1>
              <p className="mb-4 text-center text-sm text-gray-600">Choose a new password for your account.</p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-gray-700">New password</label>
              <input
                id="newPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">Confirm new password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
