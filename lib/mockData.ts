export interface FuelStation {
  id: string
  name: string
  brand: string
  address: string
  postcode: string
  lat: number
  lng: number
  petrol: number | null
  diesel: number | null
  lastUpdated: string
}

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  date: string
  readTime: number
  category: string
}

export const UK_AVG_PRICES = {
  petrol: 142.9,
  diesel: 148.3,
  lastUpdated: new Date().toISOString(),
}

export const MOCK_STATIONS: FuelStation[] = [
  { id: '1', name: 'Tesco Extra', brand: 'Tesco', address: '100 High Street', postcode: 'SW1A 1AA', lat: 51.5012, lng: -0.1419, petrol: 138.9, diesel: 143.9, lastUpdated: new Date().toISOString() },
  { id: '2', name: 'BP London Bridge', brand: 'BP', address: '45 Borough High St', postcode: 'SE1 1NA', lat: 51.5033, lng: -0.0857, petrol: 142.9, diesel: 147.9, lastUpdated: new Date().toISOString() },
  { id: '3', name: 'Shell Victoria', brand: 'Shell', address: '12 Vauxhall Bridge Rd', postcode: 'SW1V 2SA', lat: 51.4953, lng: -0.1390, petrol: 144.9, diesel: 149.9, lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Sainsbury\'s Fulham', brand: 'Sainsbury\'s', address: '80 Fulham Palace Rd', postcode: 'W6 9PL', lat: 51.4871, lng: -0.2108, petrol: 139.9, diesel: 144.9, lastUpdated: new Date().toISOString() },
  { id: '5', name: 'Asda Lewisham', brand: 'Asda', address: '40 Lee High Rd', postcode: 'SE13 5PT', lat: 51.4583, lng: -0.0026, petrol: 137.9, diesel: 142.9, lastUpdated: new Date().toISOString() },
  { id: '6', name: 'Morrisons Catford', brand: 'Morrisons', address: '60 Rushey Green', postcode: 'SE6 4HW', lat: 51.4468, lng: -0.0218, petrol: 138.7, diesel: 143.7, lastUpdated: new Date().toISOString() },
  { id: '7', name: 'Esso Camden', brand: 'Esso', address: '30 Camden High St', postcode: 'NW1 0JH', lat: 51.5390, lng: -0.1426, petrol: 143.9, diesel: 148.9, lastUpdated: new Date().toISOString() },
  { id: '8', name: 'Jet Hackney', brand: 'Jet', address: '15 Mare Street', postcode: 'E8 4RP', lat: 51.5428, lng: -0.0557, petrol: 141.9, diesel: 146.9, lastUpdated: new Date().toISOString() },
]

export const mockBlogPosts: BlogPost[] = [
  { slug: 'how-to-find-cheapest-petrol-uk', title: 'How to Find the Cheapest Petrol in the UK in 2024', excerpt: 'Our complete guide to saving money on fuel — from supermarket petrol to timing your fill-up right.', date: '2024-05-01', readTime: 6, category: 'Fuel Saving Tips' },
  { slug: 'petrol-vs-diesel-2024', title: 'Petrol vs Diesel in 2024: Which Should You Choose?', excerpt: 'We break down the real costs of petrol and diesel including fuel economy, maintenance, and future resale values.', date: '2024-04-22', readTime: 8, category: 'Buying Advice' },
  { slug: 'supermarket-petrol-worth-it', title: 'Is Supermarket Petrol Worth It? Tesco vs Asda vs Sainsbury\'s', excerpt: 'Supermarket fuel is usually the cheapest — but is it as good as branded stations? We investigate.', date: '2024-04-10', readTime: 5, category: 'Fuel Saving Tips' },
  { slug: 'best-mpg-cars-uk-2024', title: 'The 10 Most Fuel-Efficient Cars on Sale in the UK Right Now', excerpt: 'From hybrids to small diesels, these are the cars that will cost you the least to run in 2024.', date: '2024-03-29', readTime: 7, category: 'Car Reviews' },
  { slug: 'ev-vs-petrol-running-costs', title: 'Electric vs Petrol: The Real Running Cost Comparison for 2024', excerpt: 'Is going electric really cheaper? We crunch the numbers across purchase price, charging, insurance and more.', date: '2024-03-18', readTime: 9, category: 'EV Guide' },
  { slug: 'how-fuel-prices-are-set-uk', title: 'How Are UK Fuel Prices Set? A Simple Explanation', excerpt: 'Oil prices, duty, VAT, retailer margins — we explain exactly how the pump price is calculated.', date: '2024-03-05', readTime: 6, category: 'Industry Explainer' },
]

export function priceBand(p: number): 'cheap' | 'mid' | 'expensive' {
  if (p <= 139.9) return 'cheap'
  if (p <= 145.9) return 'mid'
  return 'expensive'
}

export function priceBandColor(p: number): string {
  const band = priceBand(p)
  if (band === 'cheap') return '#22c55e'
  if (band === 'mid') return '#f59e0b'
  return '#ef4444'
}
