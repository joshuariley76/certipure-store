import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import GateModal from "@/components/GateModal"
import AgeGateModal from "@/components/AgeGateModal"
import CartDrawer from "@/components/CartDrawer"
import { CartProvider } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://certipure.net"

const SITE_TITLE = "CertiPure — Premium Research Peptides | Third-Party Lab Tested"
const SITE_DESCRIPTION =
  "CertiPure sells lab-tested research peptides with independent third-party COA verification on every batch. Shop BPC-157, TB-500, NAD+, GHK-Cu and more, with fast U.S. shipping."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "CertiPure",
  // Helps Google associate the domain with the brand name people type.
  keywords: [
    "CertiPure",
    "CertiPure peptides",
    "research peptides",
    "buy research peptides",
    "third party tested peptides",
    "peptide COA",
    "BPC-157",
    "TB-500",
    "NAD+",
    "GHK-Cu",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Allows full-size image thumbnails and rich snippets in results.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the code Google Search Console
  // gives you and this page will carry the verification tag automatically.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  // The share image itself is provided by src/app/opengraph-image.tsx, which
  // Next.js wires in automatically.
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "CertiPure",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
}

// Brand identity for Google. This is what lets a search for "certipure" show
// the store with its logo and name rather than a plain blue link.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": `${SITE_URL}/#organization`,
  name: "CertiPure",
  alternateName: ["CertiPure Peptides", "CertiPure Research Peptides"],
  url: SITE_URL,
  logo: `${SITE_URL}/certipure-logo.jpg`,
  image: `${SITE_URL}/certipure-hero-2.jpg`,
  description: SITE_DESCRIPTION,
  slogan: "Tested – Trusted – Affordable",
  areaServed: { "@type": "Country", name: "United States" },
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "CertiPure",
  description: SITE_DESCRIPTION,
  inLanguage: "en-US",
  publisher: { "@id": `${SITE_URL}/#organization` },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Some pages must be reachable without an account — e.g. a customer paying an
  // invoice link they were emailed. Those bypass the signup gate.
  const pathname = (await headers()).get("x-pathname") || ""
  const bypassGate = pathname.startsWith("/invoice")
  const showGate = !user && !bypassGate

  return (
    <html lang="en" className="overflow-x-hidden">
      <head>
        {/* Opening the connection to Google Fonts early shaves load time off
            every page, which is a direct Google ranking factor. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />

        {/* Google Analytics 4 — only loads when NEXT_PUBLIC_GA_ID is set.
            This must sit inside <head>: Google Search Console's Analytics
            ownership check rejects the snippet anywhere else, and loading it
            earlier also makes the visit data more accurate. */}
        {gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`,
              }}
            />
          </>
        )}
      </head>
      <body className="bg-white text-gray-900 antialiased overflow-x-hidden">
        <AgeGateModal />
        <CartProvider>
          {!showGate ? (
            <>
              <Navbar />
              {children}
              <Footer />
            </>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="h-screen overflow-hidden pointer-events-none select-none blur-lg"
              >
                <Navbar />
                {children}
                <Footer />
              </div>
              <GateModal />
            </>
          )}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  )
}
