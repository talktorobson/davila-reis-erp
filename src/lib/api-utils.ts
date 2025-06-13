// D'Avila Reis ERP - API Utilities
// Standardized API response formatting, error handling, and validation

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Standard API response interface
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    timestamp: string
    version?: string
    [key: string]: unknown
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

// Standard error responses
export const ApiErrors = {
  UNAUTHORIZED: {
    status: 401,
    error: 'Acesso não autorizado',
    code: 'UNAUTHORIZED'
  },
  FORBIDDEN: {
    status: 403,
    error: 'Acesso negado',
    code: 'FORBIDDEN'
  },
  NOT_FOUND: {
    status: 404,
    error: 'Recurso não encontrado',
    code: 'NOT_FOUND'
  },
  BAD_REQUEST: {
    status: 400,
    error: 'Requisição inválida',
    code: 'BAD_REQUEST'
  },
  VALIDATION_ERROR: {
    status: 422,
    error: 'Dados inválidos',
    code: 'VALIDATION_ERROR'
  },
  RATE_LIMITED: {
    status: 429,
    error: 'Muitas tentativas. Tente novamente mais tarde.',
    code: 'RATE_LIMITED'
  },
  INTERNAL_ERROR: {
    status: 500,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR'
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    error: 'Serviço temporariamente indisponível',
    code: 'SERVICE_UNAVAILABLE'
  }
} as const

// Success response helper
export function successResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  }

  if (message) {
    response.message = message
  }

  return NextResponse.json(response)
}

// Error response helper
export function errorResponse(
  errorType: keyof typeof ApiErrors,
  customMessage?: string,
  details?: Record<string, unknown>
): NextResponse<ApiResponse> {
  const error = ApiErrors[errorType]
  
  const response: ApiResponse = {
    success: false,
    error: customMessage || error.error,
    meta: {
      timestamp: new Date().toISOString(),
      code: error.code
    }
  }

  if (details && response.meta) {
    response.meta.details = details
  }

  return NextResponse.json(response, { status: error.status })
}

// Paginated response helper
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
  },
  meta?: Record<string, unknown>
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  }

  return NextResponse.json(response)
}

// Request validation helpers
export interface ValidationRule {
  field: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'email' | 'cnpj' | 'phone'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export function validateRequest(
  data: any,
  rules: ValidationRule[]
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const rule of rules) {
    const value = data[rule.field]
    
    // Required field validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: rule.field,
        message: `Campo '${rule.field}' é obrigatório`
      })
      continue
    }

    // Skip other validations if field is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue
    }

    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value)) {
            errors.push({
              field: rule.field,
              message: `Campo '${rule.field}' deve ser um email válido`,
              value
            })
          }
          break

        case 'cnpj':
          const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/
          if (!cnpjRegex.test(value)) {
            errors.push({
              field: rule.field,
              message: `Campo '${rule.field}' deve ser um CNPJ válido`,
              value
            })
          }
          break

        case 'phone':
          const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/
          if (!phoneRegex.test(value)) {
            errors.push({
              field: rule.field,
              message: `Campo '${rule.field}' deve ser um telefone válido`,
              value
            })
          }
          break

        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push({
              field: rule.field,
              message: `Campo '${rule.field}' deve ser um número`,
              value
            })
          }
          break

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({
              field: rule.field,
              message: `Campo '${rule.field}' deve ser verdadeiro ou falso`,
              value
            })
          }
          break

        case 'string':
        default:
          if (typeof value !== 'string') {
            errors.push({
              field: rule.field,
              message: `Campo '${rule.field}' deve ser texto`,
              value
            })
          }
          break
      }
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: `Campo '${rule.field}' deve ter pelo menos ${rule.minLength} caracteres`,
          value
        })
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field: rule.field,
          message: `Campo '${rule.field}' deve ter no máximo ${rule.maxLength} caracteres`,
          value
        })
      }
    }

    // Numeric range validation
    if (typeof value === 'number' || !isNaN(Number(value))) {
      const numValue = Number(value)
      
      if (rule.min !== undefined && numValue < rule.min) {
        errors.push({
          field: rule.field,
          message: `Campo '${rule.field}' deve ser maior ou igual a ${rule.min}`,
          value
        })
      }
      
      if (rule.max !== undefined && numValue > rule.max) {
        errors.push({
          field: rule.field,
          message: `Campo '${rule.field}' deve ser menor ou igual a ${rule.max}`,
          value
        })
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push({
          field: rule.field,
          message: `Campo '${rule.field}' não atende ao formato esperado`,
          value
        })
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value)
      if (customResult !== true) {
        errors.push({
          field: rule.field,
          message: typeof customResult === 'string' 
            ? customResult 
            : `Campo '${rule.field}' falhou na validação customizada`,
          value
        })
      }
    }
  }

  return errors
}

// Error logging helper with context
export function logApiError(
  error: Error | string,
  _context: {
    endpoint: string
    method: string
    userId?: string
    clientId?: string
    ip?: string
    userAgent?: string
    requestData?: any
  }
): void {
  const errorMessage = error instanceof Error ? error.message : error

  logger.error(`API Error: ${errorMessage}`, error instanceof Error ? error : new Error(String(errorMessage)))
}

// Rate limiting helper (in-memory store for demo)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `rate_limit:${identifier}`
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    const resetTime = now + windowMs
    rateLimitStore.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }

  current.count++
  return { 
    allowed: true, 
    remaining: maxRequests - current.count, 
    resetTime: current.resetTime 
  }
}

// Cleanup rate limit store periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute

export default {
  successResponse,
  errorResponse,
  paginatedResponse,
  validateRequest,
  logApiError,
  checkRateLimit,
  ApiErrors
}