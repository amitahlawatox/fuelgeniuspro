import type { Metadata } from 'next'
import FuelTrackerClient from './FuelTrackerClient'

export const metadata: Metadata = {
  title: 'Live Fuel Price Map — Cheapest Petrol & Diesel Near You',
  description: 'Find the cheapest petrol and diesel prices near you on our live UK map. Filter by fuel type, brand and radius. Updated every 15 minutes from the official UK government feed.',
}

export default function FuelTrackerPage() {
  return <FuelTrackerClient />
}
