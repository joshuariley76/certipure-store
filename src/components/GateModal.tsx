'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Supabase only honours a `redirect_to` that is on the project's Redirect URL
// allow-list - anything else is silently swapped for the project Site URL, and
// the customer never reaches /auth/callback. window.location.origin varies
// (www vs bare vs preview builds), so we always send the one canonical origin.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '')

function authRedirectBase() {
  if (typeof window === 'undefined') return SITE_URL
  const host = window.location.hostname
  // Local development has its own allow-list entry and no canonical host.
  if (host === 'localhost' || host === '127.0.0.1') return window.location.origin
  return SITE_URL || window.location.origin
}

// Remember which address just signed up, so that when the confirmation link
// brings them back we can open the sign-in form already filled in, instead of
// the sign-up form they have already completed. Browser-local only - this is
// never put in a URL and never leaves the visitor's own device.
const PENDING_EMAIL_KEY = 'certipure.pendingEmail'

function rememberPendingEmail(value: string) {
  try {
    window.localStorage.setItem(PENDING_EMAIL_KEY, value)
  } catch {
    // Private browsing or blocked storage - prefilling is a convenience only.
  }
}

function readPendingEmail() {
  try {
    return window.localStorage.getItem(PENDING_EMAIL_KEY)
  } catch {
    return null
  }
}

function forgetPendingEmail() {
  try {
    window.localStorage.removeItem(PENDING_EMAIL_KEY)
  } catch {
    // Nothing to clean up.
  }
}

export default function GateModal() {
  const [mode, setMode] = useState<'signup' | 'login' | 'reset'>('signup')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  // True when the visitor has just clicked the email-verification link, so we
  // can greet them and open the sign-in form instead of the sign-up form.
  const [justVerified, setJustVerified] = useState(false)
  // Until we've checked for an existing session we render nothing, so a
  // logged-in visitor never sees the sign-in form flash before redirecting.
  const [checkingSession, setCheckingSession] = useState(true)
  // Set when the visitor arrives from a confirmation link that did not work
  // (expired, already used, or opened on a different device). We say what
  // happened and offer a fresh link instead of silently showing the sign-up
  // form again, which is what used to happen.
  const [verifyProblem, setVerifyProblem] = useState<string | null>(null)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const supabase = createClient()

  // If the visitor already has an active Supabase session (e.g. they just
  // verified their email, or they're a returning logged-in customer), skip
  // the gate entirely and send them straight to the shop.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/shop'
      } else {
        // A confirmation link reports its outcome in three different places:
        // /auth/callback forwards `?verify=failed&reason=...`, while Supabase
        // bouncing the visitor straight to the Site URL puts it in the query
        // string AND repeats it in the hash fragment
        // (`#error=access_denied&error_code=otp_expired`). The hash never
        // reaches the server, so only client code can catch that last one.
        const params = new URLSearchParams(window.location.search)
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const reason =
          (params.get('verify') === 'failed' ? params.get('reason') : null) ||
          params.get('error_code') ||
          params.get('error') ||
          hash.get('error_code') ||
          hash.get('error')

        const cameFromEmailLink = params.get('signin') === '1' || Boolean(reason)

        if (cameFromEmailLink) {
          // Whatever the outcome, someone arriving from a confirmation link has
          // already filled in the sign-up form once. Put them on SIGN IN with
          // their address already loaded rather than making them start over.
          setMode('login')
          const remembered = readPendingEmail()
          if (remembered) setEmail(remembered)
        }

        if (reason) {
          setJustVerified(false)
          setShowResend(true)
          setVerifyProblem(
            reason === 'otp_expired' || reason === 'access_denied'
              ? 'This confirmation link has already been used, or it has expired. If you have already confirmed your email, just sign in below — otherwise send yourself a fresh link.'
              : 'We could not finish signing you in from that link. This usually happens when the email is opened on a different device than you signed up on. Your email may already be confirmed, so try signing in below; if that does not work, send yourself a new link.'
          )
        } else if (params.get('signin') === '1') {
          setJustVerified(true)
        }

        if (cameFromEmailLink) {
          // Clear the markers so a refresh does not replay the message.
          window.history.replaceState({}, '', window.location.pathname)
        }

        setCheckingSession(false)
      }
    })
    // The browser client is a stable singleton, so this runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!firstName.trim()) {
      setError('Please enter your first name.')
      return
    }
    if (!lastName.trim()) {
      setError('Please enter your last name.')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (!agreedToTerms) {
      setError('You must be 21+ and agree to the Terms & Conditions.')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Send the verification link to our callback route, which logs the
          // user in and then forwards them on. Without this, Supabase falls
          // back to the project Site URL (the homepage), which drops the user
          // on the default sign-up gate instead of signing them in.
          emailRedirectTo: `${authRedirectBase()}/auth/callback`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            agreed_to_terms: true,
            agreed_to_terms_at: new Date().toISOString(),
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Something went wrong creating your account. Please try again.')
        setLoading(false)
        return
      }

      // Stash it for the trip through the inbox and back.
      rememberPendingEmail(email.trim())
      setShowConfirmationMessage(true)
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setError('Please confirm your email first - check your inbox, and your spam folder.')
          // The one case where we know for certain that a new link helps.
          setShowResend(true)
          setResendSent(false)
        } else {
          setError('Invalid email or password. Please try again.')
        }
        setLoading(false)
        return
      }

      // Success — the page will refresh to show the site
      forgetPendingEmail()
      window.location.reload()
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Send a password-reset email. Supabase mails a link back to /auth/callback,
  // which signs the user in with a recovery session and forwards them to
  // /auth/update-password to choose a new password.
  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${authRedirectBase()}/auth/callback?next=/auth/update-password`,
      })

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setResetSent(true)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Send a fresh confirmation link. Until this existed, a customer whose email
  // landed in spam had no way back in at all except emailing support.
  async function handleResend() {
    if (!email.trim()) {
      setError('Enter your email address above, then tap resend.')
      return
    }

    setResending(true)
    setError(null)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: `${authRedirectBase()}/auth/callback` },
      })

      if (resendError) {
        const msg = resendError.message.toLowerCase()
        if (msg.includes('already') && msg.includes('confirm')) {
          // Nothing to resend - they only need to sign in.
          setVerifyProblem(null)
          setShowResend(false)
          setMode('login')
          setError('That email is already confirmed. Please sign in below.')
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('Too many emails requested just now. Please wait a minute and try again.')
        } else {
          setError(resendError.message)
        }
        setResending(false)
        return
      }

      setResendSent(true)
    } catch (err) {
      console.error(err)
      setError('We could not send that email. Please contact support@certipure.net.')
    } finally {
      setResending(false)
    }
  }

  // Still checking for an existing session, or one was found and we're
  // redirecting — render nothing so the form never flashes.
  if (checkingSession) {
    return null
  }

  // "Check your email" confirmation screen
  if (showConfirmationMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mb-2 text-gray-600">
            We&apos;ve sent a confirmation link to:
          </p>
          <p className="mb-6 font-semibold text-gray-900">{email}</p>
          <p className="mb-6 text-sm text-gray-500">
            Click the link in the email to verify your account. Then come back here and sign in.
          </p>
          <button
            onClick={() => {
              setShowConfirmationMessage(false)
              setMode('login')
              setPassword('')
            }}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Got it — take me to sign in
          </button>
          {resendSent ? (
            <p className="mt-4 text-xs text-green-600">
              Sent again. It can take a minute to arrive.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-4 text-xs font-semibold text-blue-600 underline hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? 'Sending...' : 'Didn\u2019t get it? Send the email again'}
            </button>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Check your spam folder too. Corporate mail filters sometimes hold these.
            Still stuck? Contact support@certipure.net
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl my-8">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/certipure-logo.jpg"
            alt="CertiPure"
            width={280}
            height={90}
            priority
            className="h-auto w-auto max-h-20"
          />
        </div>

        {/* Heading */}
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          {mode === 'signup'
            ? 'Access Our Full Peptide Catalog'
            : mode === 'reset'
            ? 'Reset Your Password'
            : 'Welcome Back'}
        </h2>
        <p className="mb-6 text-center text-sm text-gray-600">
          {mode === 'signup'
            ? 'Create a free account to view all products, detailed research insights, and exclusive pricing.'
            : mode === 'reset'
            ? 'We’ll email you a secure link to set a new password.'
            : 'Sign in to access your account and browse our catalog.'}
        </p>

        {/* Email-verified confirmation (shown once, after clicking the link).
            Gated on verifyProblem so we never tell someone their email is
            verified when the link they just clicked actually failed. */}
        {justVerified && mode === 'login' && !error && !verifyProblem && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Your email is verified. Please sign in below to access the catalog.
          </div>
        )}

        {/* What went wrong with the confirmation link they clicked */}
        {verifyProblem && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {verifyProblem}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Escape hatch: send a fresh confirmation link */}
        {showResend && (
          resendSent ? (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              If <span className="font-medium">{email}</span> still needs confirming,
              a new link is on its way — it can take a minute, and it may land in
              your spam folder. If that address is already confirmed, no email is
              sent; just sign in below.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mb-4 w-full rounded-lg border border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? 'Sending...' : 'Resend confirmation email'}
            </button>
          )
        )}

        {/* Signup form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Jane"
                  autoComplete="given-name"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Researcher"
                  autoComplete="family-name"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">
                I confirm that I am 21 years of age or older and I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-blue-600 underline hover:text-blue-800">
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-blue-600 underline hover:text-blue-800">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Get Free Access'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already a member?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
                className="font-semibold text-blue-600 underline hover:text-blue-800"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* Login form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="loginEmail" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="loginEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="loginPassword" className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="loginPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Your password"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setMode('reset')
                  setError(null)
                  setResetSent(false)
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Need an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setError(null)
                }}
                className="font-semibold text-blue-600 underline hover:text-blue-800"
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* Reset-password form */}
        {mode === 'reset' && (
          resetSent ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-center text-sm text-green-700">
              <p className="font-semibold text-green-800">Check your email</p>
              <p className="mt-1">
                If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a link to reset your password.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError(null)
                  setResetSent(false)
                }}
                className="mt-4 font-semibold text-blue-600 underline hover:text-blue-800"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="resetEmail" className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                  className="font-semibold text-blue-600 underline hover:text-blue-800"
                >
                  Sign in
                </button>
              </p>
            </form>
          )
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Questions? Contact support@certipure.net
        </p>
      </div>
    </div>
  )
}
