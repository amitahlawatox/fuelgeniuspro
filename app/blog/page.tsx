import Link from 'next/link'
import { mockBlogPosts } from '@/lib/mockData'
import { BookOpen, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fuel Economy Blog — Tips, Guides & News',
  description: 'Expert advice on saving money on fuel, car running costs, EV switching guides, and UK fuel price news.',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Fuel Saving Tips': 'bg-green-500/10 text-green-400',
  'Buying Advice': 'bg-blue-500/10 text-blue-400',
  'Car Reviews': 'bg-purple-500/10 text-purple-400',
  'EV Guide': 'bg-yellow-500/10 text-yellow-400',
  'Industry Explainer': 'bg-gray-500/10 text-gray-400',
}

export default function BlogPage() {
  const featured = mockBlogPosts[0]
  const rest = mockBlogPosts.slice(1)
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Fuel Economy Blog</h1>
      </div>
      <p className="text-gray-400 mb-8">Expert tips on saving money at the pump and running your car more cheaply.</p>

      {/* Featured */}
      <Link href={`/blog/${featured.slug}`} className="block bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-500/20 rounded-xl p-6 mb-8 hover:border-green-500/40 transition-colors">
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${CATEGORY_COLORS[featured.category] || 'bg-gray-800 text-gray-400'}`}>{featured.category}</span>
        <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400">{featured.title}</h2>
        <p className="text-gray-400 mb-4">{featured.excerpt}</p>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{new Date(featured.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {featured.readTime} min read</span>
        </div>
      </Link>

      <div className="grid sm:grid-cols-2 gap-6">
        {rest.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${CATEGORY_COLORS[post.category] || 'bg-gray-800 text-gray-400'}`}>{post.category}</span>
            <h2 className="font-semibold text-white mb-2 leading-snug">{post.title}</h2>
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{post.excerpt}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{new Date(post.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime} min</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
