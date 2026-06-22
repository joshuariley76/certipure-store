// Lightweight MailerLite API client.
//
// We use this to add subscribers to MailerLite groups so we can email them
// (the welcome/10%-off offer, newsletters, etc.). Every call returns a result
// object instead of throwing, so callers can treat email sync as best-effort
// and never block a user's signup or checkout if MailerLite is slow or down.
//
// Group IDs come from environment variables (see .env.local):
//   MAILERLITE_API_KEY           — the account API token
//   MAILERLITE_GROUP_CUSTOMERS   — people who created an account
//   MAILERLITE_GROUP_NEWSLETTER  — general newsletter subscribers

const ML_BASE = 'https://connect.mailerlite.com/api'

export const MAILERLITE_GROUPS = {
  customers: process.env.MAILERLITE_GROUP_CUSTOMERS || '',
  newsletter: process.env.MAILERLITE_GROUP_NEWSLETTER || '',
}

export type MailerLiteResult = { ok: boolean; status: number; error?: string }

interface AddSubscriberParams {
  email: string
  groupId: string
  /** Standard MailerLite fields, e.g. { name, last_name }. Custom fields must
   *  already exist in the account or MailerLite rejects the request. */
  fields?: Record<string, string | number | null>
}

/**
 * Add (or update) a subscriber and place them in a group.
 *
 * POST /subscribers upserts by email: it creates the subscriber if new, or
 * updates the existing one, and `groups` adds them to the given group. That
 * means it is safe to call more than once for the same person — MailerLite
 * deduplicates by email.
 */
export async function addSubscriberToGroup({
  email,
  groupId,
  fields,
}: AddSubscriberParams): Promise<MailerLiteResult> {
  const apiKey = process.env.MAILERLITE_API_KEY
  if (!apiKey) return { ok: false, status: 0, error: 'MAILERLITE_API_KEY is not set' }
  if (!groupId) return { ok: false, status: 0, error: 'No MailerLite group id provided' }

  try {
    const res = await fetch(`${ML_BASE}/subscribers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        ...(fields ? { fields } : {}),
        groups: [groupId],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: detail.slice(0, 500) }
    }
    return { ok: true, status: res.status }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'unknown error' }
  }
}
