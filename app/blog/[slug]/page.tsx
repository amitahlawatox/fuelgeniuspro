import { mockBlogPosts } from '@/lib/mockData'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return mockBlogPosts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = mockBlogPosts.find(p => p.slug === params.slug)
  if (!post) return {}
  return { title: post.title, description: post.excerpt }
}

const FULL_CONTENT: Record<string, string> = {
  'how-to-find-cheapest-petrol-uk': `Finding the cheapest petrol in your area doesn't have to be a chore. With live fuel price tracking tools like FuelGeniusPro, you can see every station near you and exactly what they're charging right now.\n\n**Use supermarket forecourts first.** Tesco, Asda, Sainsbury's, and Morrisons consistently undercut branded stations by 3–8p per litre. On a 50-litre fill-up, that's up to £4 saved every time.\n\n**Timing matters.** Fuel prices tend to drop mid-week — Tuesday and Wednesday mornings often see the lowest prices as stations compete for commuter traffic. Avoid filling up on Thursdays and Fridays when prices creep up for the weekend.\n\n**Use a fuel card or supermarket loyalty points.** Tesco Clubcard and Nectar points can be redeemed directly against fuel, effectively giving you a discount of 2–5p per litre if you shop at those supermarkets regularly.\n\n**Don't drive miles out of your way.** The fuel cost of a detour can cancel out the saving. Use the map to find the cheapest station that's already on your route.`,
  'petrol-vs-diesel-2024': `The petrol vs diesel debate has shifted significantly since 2020. Here's the honest breakdown for 2024.\n\n**Diesel is still cheaper per mile** — diesel engines are typically 20–30% more fuel-efficient than equivalent petrol units. But diesel fuel itself costs around 5–8p per litre more at the pump, which erodes that advantage.\n\n**For high-mileage drivers (15,000+ miles/year):** Diesel still wins on running cost. The better fuel economy more than offsets the higher pump price.\n\n**For low-mileage city drivers:** Petrol (or hybrid) is the better choice. Diesel particulate filters (DPFs) clog if you never do long motorway runs, leading to expensive repairs.\n\n**Residual values:** Diesel residuals have softened due to uncertainty around ULEZ and Clean Air Zones. Many used diesel cars are now significantly cheaper to buy than equivalent petrols.\n\n**The verdict:** If you do under 12,000 miles a year, mostly around town, choose petrol or hybrid. Above 15,000 miles with regular motorway use, diesel still makes financial sense.`,
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = mockBlogPosts.find(p => p.slug === params.slug)
  if (!post) notFound()
  const content = FULL_CONTENT[post.slug] || post.excerpt + '\n\n*Full article coming soon — check back shortly.*'
  const related = mockBlogPosts.filter(p => p.slug !== post.slug).slice(0,3)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-400 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>
      <div className="mb-2">
        <span className="text-xs font-semibold bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full">{post.category}</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 mb-4 leading-tight">{post.title}</h1>
      <div className="flex items-center gap-3 text-sm text-gray-400 mb-8 pb-8 border-b border-gray-200">
        <span>{new Date(post.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</span>
        <span>·</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.readTime} min read</span>
        <span>·</span>
        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> FuelGeniusPro</span>
      </div>
      <div className="prose prose-invert prose-green max-w-none text-gray-500 leading-relaxed space-y-4">
        {content.split('\n\n').map((para, i) => (
          <p key={i} className="text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{__html: para.replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>')}} />
        ))}
      </div>
      {related.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="font-bold text-gray-900 text-lg mb-4">Related Articles</h2>
          <div className="space-y-3">
            {related.map(r => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0"><BookOpen className="h-4 w-4 text-gray-400" /></div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.readTime} min read · {r.category}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
