// Shippo shipping-label helper.
//
// Flow (matches the admin UI): build a shipment -> Shippo returns rates ->
// the admin picks one -> we buy that rate, which returns a tracking number and
// a printable PDF label.
//
// NOTE: USPS requires the sender's email AND phone on the from-address, or the
// label purchase fails with `sender_info_missing`.

const API = 'https://api.goshippo.com'

function token(): string {
  return process.env.SHIPPO_API_TOKEN || ''
}

export function shippoConfigured(): boolean {
  return Boolean(token())
}

// True when we're on a test token — labels are free and not real postage.
export function shippoIsTestMode(): boolean {
  return token().startsWith('shippo_test')
}

export interface ShippoAddress {
  name: string
  company?: string
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
  country: string
  email?: string
  phone?: string
}

// The merchant's ship-from / return address. Values can be overridden by env
// vars; the defaults are CertiPure's address so no env setup is required.
export function shipFrom(): ShippoAddress {
  return {
    name: process.env.SHIP_FROM_NAME || 'CertiPure',
    street1: process.env.SHIP_FROM_STREET1 || '150228 Bellflower St',
    city: process.env.SHIP_FROM_CITY || 'Wausau',
    state: process.env.SHIP_FROM_STATE || 'WI',
    zip: process.env.SHIP_FROM_ZIP || '54401',
    country: 'US',
    email: process.env.SHIP_FROM_EMAIL || 'joshua@certipure.net',
    phone: process.env.SHIP_FROM_PHONE || '',
  }
}

async function shippo(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `ShippoToken ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Shippo ${path} failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`)
  }
  return json as any
}

export interface RateOption {
  id: string
  provider: string       // e.g. "USPS"
  service: string        // e.g. "Ground Advantage"
  amount: string         // e.g. "6.07"
  currency: string
  estimatedDays: number | null
}

export interface Parcel {
  length: string
  width: string
  height: string
  weightOz: string
}

// Step 1 — quote. Returns every rate we can actually buy, cheapest first.
export async function getRates(to: ShippoAddress, parcel: Parcel): Promise<RateOption[]> {
  const data = await shippo('/shipments/', {
    address_from: shipFrom(),
    address_to: to,
    parcels: [{
      length: parcel.length,
      width: parcel.width,
      height: parcel.height,
      distance_unit: 'in',
      weight: parcel.weightOz,
      mass_unit: 'oz',
    }],
    async: false,
  })
  return ((data.rates || []) as any[])
    .map((r) => ({
      id: r.object_id,
      provider: r.provider,
      service: r.servicelevel?.name || '',
      amount: r.amount,
      currency: r.currency || 'USD',
      estimatedDays: typeof r.estimated_days === 'number' ? r.estimated_days : null,
    }))
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))
}

export interface PurchasedLabel {
  trackingNumber: string
  labelUrl: string
  trackingUrl: string | null
}

// Step 2 — buy the chosen rate. Throws with Shippo's own message on failure
// (e.g. an un-activated UPS account, or a missing sender phone for USPS).
export async function buyLabel(rateId: string): Promise<PurchasedLabel> {
  const tx = await shippo('/transactions/', {
    rate: rateId,
    label_file_type: 'PDF_4x6',
    async: false,
  })
  if (tx.status !== 'SUCCESS' || !tx.label_url) {
    const msg = Array.isArray(tx.messages) && tx.messages.length
      ? tx.messages.map((m: any) => m.text).join('; ')
      : 'Label purchase failed.'
    throw new Error(msg)
  }
  return {
    trackingNumber: tx.tracking_number || '',
    labelUrl: tx.label_url,
    trackingUrl: tx.tracking_url_provider || null,
  }
}
