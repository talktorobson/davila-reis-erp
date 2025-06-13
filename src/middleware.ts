// D'Avila Reis ERP - Security and Authentication Middleware

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  // Basic security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Check if it's a portal route
  if (req.nextUrl.pathname.startsWith('/portal')) {
    try {
      const token = await getToken({ 
        req,
        secret: process.env.NEXTAUTH_SECRET
      })
      
      if (!token) {
        // Redirect to signin with callback URL
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
        return NextResponse.redirect(signInUrl)
      }
      
      // Check if user has portal access
      if (token.role !== 'client' && token.role !== 'admin') {
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('error', 'AccessDenied')
        return NextResponse.redirect(signInUrl)
      }
    } catch (error) {
      console.error('Middleware auth error:', error)
      // On error, redirect to signin
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
      return NextResponse.redirect(signInUrl)
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}