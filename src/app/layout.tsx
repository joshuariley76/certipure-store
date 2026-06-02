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

export const metadata: Metadata = {
  title: "CertiPure — Research Peptides | 99%+ Purity, Third-Party Tested",
  description: "Research peptides with 99%+ purity. Every batch third-party lab tested with COAs available.",
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
