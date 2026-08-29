import { Resend } from 'resend'

// Single shared Resend client used by server-side code (API routes) to send
// transactional emails such as order confirmations. The API key lives in
// .env.local as RESEND_API_KEY and is never exposed to the browser.
export const resend = new Resend(process.env.RESEND_API_KEY)

// The address emails are sent *from*. certipure.net is verified in Resend, so
// the default is a real address on the domain. It used to fall back to
// onboarding@resend.dev, which only ever delivers to the Resend account owner
// — so the moment the cart-reminder cron found an eligible cart it would have
// silently failed to reach the actual customer, with no one watching. Set
// RESEND_FROM_EMAIL to override per environment.
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'CertiPure <noreply@certipure.net>'
