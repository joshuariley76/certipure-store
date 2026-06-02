import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import GateModal from "@/components/GateModal"
import AgeGateModal from "@/components/AgeGateModal"
import CartDrawer from "@/components/CartDrawer"
import { CartProvider } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/server"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://certipure.net"

const SITE_TITLE = "CertiPure — Premium Research Peptides"
const SITE_DESCRIPTION =
  "Lab-tested research peptides with independent third-party COA verification. Shop BPC-157, GLP-3, TB-500, NAD+ and more."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // The share image itself is provided by src/app/opengraph-image.tsx, which
  // Next.js wires in automatically.
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "CertiPure",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <AgeGateModal />
        <CartProvider>
          {user ? (
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

        {/* Google Analytics 4 — only loads when NEXT_PUBLIC_GA_ID is set */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
