'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function AgeGateModal() {
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('certipure_age_verified') : null
    setVerified(stored === 'true')
  }, [])

  if (verified === null || verified === true) {
    return null
  }

  const handleConfirm = () => {
    window.localStorage.setItem('certipure_age_verified', 'true')
    setVerified(true)
  }

  const handleDecline = () => {
    window.location.href = 'https://www.google.com'
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
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

        <h2 className="mb-3 text-center text-2xl font-bold text-gray-900">
          Age Verification Required
        </h2>
        <p className="mb-8 text-center text-sm text-gray-600 leading-relaxed">
          This website contains products intended for laboratory and research professionals only.
          You must be 21 years of age or older to enter.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            I am 21 or older
          </button>
          <button
            type="button"
            onClick={handleDecline}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            I am under 21
          </button>
        </div>
      </div>
    </div>
  )
}
