import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import GateModal from "@/components/GateModal"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "CertiPure - Premium Research Peptides | 99%+ Purity",
  description: "Premium research peptides with 99%+ purity. Every batch third-party lab tested.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white text-gray-900 antialiased">
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
      </body>
    </html>
  )
}
