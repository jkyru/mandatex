import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes
  const isPublicAdvisorProfile = /^\/advisor\/[^/]+$/.test(pathname) && pathname !== '/advisor/register' && pathname !== '/advisor/dashboard'
  if (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/faq' || isPublicAdvisorProfile) {
    return NextResponse.next()
  }

  // API routes for auth
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // API routes for advisor submission (token-based, not registration)
  if (pathname.startsWith('/api/advisor') && pathname !== '/api/advisor/register') {
    return NextResponse.next()
  }

  // Protected routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const role = (req.auth?.user as any)?.role
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
