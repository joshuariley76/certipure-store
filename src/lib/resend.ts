import { Resend } from 'resend'

// Single shared Resend client used by server-side code (API routes) to send
// transactional emails such as order confirmations. The API key lives in
// .env.local as RESEND_API_KEY and is never exposed to the browser.
export const resend = new Resend(process.env.RESEND_API_KEY)

// The address emails are sent *from*. New Resend accounts can only use
// onboarding@resend.dev (and can only deliver to your own Resend account
// email) until a domain is verified. Once you verify certipure's domain in
// Resend, set RESEND_FROM_EMAIL in .env.local to e.g.
// "CertiPure <orders@yourdomain.com>".
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'CertiPure <onboarding@resend.dev>'
