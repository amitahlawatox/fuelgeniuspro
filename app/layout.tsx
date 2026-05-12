import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://fuelgeniuspro.com'),
  title: { default: 'FuelGeniusPro — Cheapest Petrol & Diesel Near You', template: '%s | FuelGeniusPro' },
  description: 'Find the cheapest petrol and diesel prices near you across the UK. Live fuel price map, journey cost calculator, EV charger finder and DVLA vehicle checker.',
  keywords: ['cheapest petrol near me', 'diesel prices UK', 'fuel price map', 'petrol prices today', 'UK fuel tracker'],
  openGraph: {
    type: 'website',
    siteName: 'FuelGeniusPro',
    title: 'FuelGeniusPro — Cheapest Petrol & Diesel Near You',
    description: 'Find cheapest fuel prices near you. Live UK petrol & diesel map.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className={inter.className}>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
