// Enhanced Security Middleware for D'Avila Reis ERP Client Portal

import { NextRequest, NextResponse } from 'next/server'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security headers configuration
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', '),
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "connect-src 'self' https: wss:",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
}

// LGPD compliance headers
export const lgpdHeaders = {
  'X-Data-Processing-Basis': 'consent,legitimate-interest',
  'X-Data-Retention-Period': '5-years',
  'X-Data-Location': 'BR-SP',
  'X-Privacy-Policy': 'https://davilareisadvogados.com.br/privacy'
}

// Apply security headers to response
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Standard security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // LGPD compliance headers
  Object.entries(lgpdHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

// Rate limiting function
export function isRateLimited(
  clientIp: string, 
  limit: number = 100, 
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const key = `rate_limit:${clientIp}`
  
  const existing = rateLimitStore.get(key)
  
  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }
  
  if (existing.count >= limit) {
    return true
  }
  
  rateLimitStore.set(key, { count: existing.count + 1, resetTime: existing.resetTime })
  return false
}

// Get client IP address
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIp) return cfConnectingIp
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIp) return realIp
  
  return 'unknown'
}

// Session security validation
export function validateSession(token: any): boolean {
  if (!token) return false
  
  // Check token expiration
  const now = Math.floor(Date.now() / 1000)
  if (token.exp && token.exp < now) return false
  
  // Check required fields
  if (!token.sub || !token.role) return false
  
  // Validate role
  const validRoles = ['admin', 'client', 'lawyer', 'staff']
  if (!validRoles.includes(token.role)) return false
  
  return true
}

// Audit logging function
export function logSecurityEvent(
  event: string,
  clientIp: string,
  userAgent: string,
  userId?: string,
  details?: any
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    clientIp,
    userAgent,
    userId,
    details,
    level: 'security'
  }
  
  // In production, send to logging service
  console.log(JSON.stringify(logEntry))
}

// Content validation for uploads
export function validateFileUpload(
  filename: string,
  contentType: string,
  size: number
): { valid: boolean; error?: string } {
  // Allowed file types for legal documents
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
  
  // Check file type
  if (!allowedTypes.includes(contentType)) {
    return { valid: false, error: 'Tipo de arquivo não permitido' }
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande (máximo 10MB)' }
  }
  
  // Check filename for security
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i  // Reserved names
  ]
  
  if (dangerousPatterns.some(pattern => pattern.test(filename))) {
    return { valid: false, error: 'Nome de arquivo inválido' }
  }
  
  return { valid: true }
}

// SQL injection detection
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /('|(\\'))|(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/i
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

// XSS detection and sanitization
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

// Enhanced request validation
export function validateRequest(request: NextRequest): {
  valid: boolean
  error?: string
  shouldBlock?: boolean
} {
  const userAgent = request.headers.get('user-agent') || ''
  const clientIp = getClientIp(request)
  
  // Block suspicious user agents
  const suspiciousAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /postman/i
  ]
  
  // Allow legitimate bots but log them
  const legitimateBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i
  ]
  
  if (suspiciousAgents.some(pattern => pattern.test(userAgent)) &&
      !legitimateBots.some(pattern => pattern.test(userAgent))) {
    logSecurityEvent('suspicious_user_agent', clientIp, userAgent)
    return {
      valid: false,
      error: 'Acesso negado',
      shouldBlock: true
    }
  }
  
  // Check for rate limiting (more permissive in development)
  const rateLimit = process.env.NODE_ENV === 'development' ? 1000 : 100
  if (isRateLimited(clientIp, rateLimit)) {
    logSecurityEvent('rate_limit_exceeded', clientIp, userAgent)
    return {
      valid: false,
      error: 'Muitas solicitações. Tente novamente em alguns minutos.',
      shouldBlock: true
    }
  }
  
  return { valid: true }
}