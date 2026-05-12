import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting (use Upstash Redis in production)
const rateLimitMap = new Map<string, { count: number; reset: number }>()

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 60

  const record = rateLimitMap.get(ip)
  if (!record || now > record.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + windowMs })
    return NextResponse.next()
  }

  record.count++
  if (record.count > maxRequests) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((record.reset - now) / 1000)) },
    })
  }

  return NextResponse.next()
}

export const config = { matcher: '/api/:path*' }
