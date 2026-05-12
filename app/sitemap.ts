import type { MetadataRoute } from 'next'
import { ukCities } from '@/lib/ukCities'
import { mockBlogPosts } from '@/lib/mockData'

const BASE = 'https://fuelgeniuspro.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const core: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${BASE}/fuel-tracker`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/journey`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/ev-charging`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/car-health`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
  ]
  const cityPages: MetadataRoute.Sitemap = ukCities.map(city => ({
    url: `${BASE}/fuel/${city.slug}`, lastModified: new Date(), changeFrequency: 'hourly' as const, priority: 0.8,
  }))
  const blogPages: MetadataRoute.Sitemap = mockBlogPosts.map(post => ({
    url: `${BASE}/blog/${post.slug}`, lastModified: new Date(post.date), changeFrequency: 'monthly' as const, priority: 0.6,
  }))
  return [...core, ...cityPages, ...blogPages]
}
