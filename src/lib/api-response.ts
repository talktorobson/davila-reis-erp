// D'Avila Reis ERP - Standardized API Response and Error Handling

import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { logger } from './logger'

// Standard API response types
export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: string
  path?: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Standard error codes
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

// Standard HTTP status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  VALIDATION_ERROR = 422,
  RATE_LIMITED = 429,
  INTERNAL_ERROR = 500,
  DATABASE_ERROR = 503,
  EXTERNAL_SERVICE_ERROR = 502,
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: HttpStatus,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Success response helpers
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: HttpStatus = HttpStatus.OK
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status: statusCode }
  )
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  },
  message?: string
): NextResponse<ApiSuccessResponse<T[]>> {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
      ...(message && { message }),
    },
    { status: HttpStatus.OK }
  )
}

// Error response helpers
export function createErrorResponse(
  error: ApiError | Error,
  path?: string
): NextResponse<ApiErrorResponse> {
  let statusCode: HttpStatus
  let errorCode: ErrorCode
  let message: string
  let details: any

  if (error instanceof ApiError) {
    statusCode = error.statusCode
    errorCode = error.code
    message = error.message
    details = error.details
  } else if (error instanceof ZodError) {
    statusCode = HttpStatus.VALIDATION_ERROR
    errorCode = ErrorCode.VALIDATION_ERROR
    message = 'Validation failed'
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }))
  } else {
    statusCode = HttpStatus.INTERNAL_ERROR
    errorCode = ErrorCode.INTERNAL_ERROR
    message = 'Internal server error'
    details = process.env.NODE_ENV === 'development' ? error.message : undefined
  }

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
    ...(path && { path }),
  }

  // Log error for monitoring
  logger.error(`API Error: ${errorCode} - ${message}`, error instanceof Error ? error : new Error(message))

  return NextResponse.json(response, { status: statusCode })
}

// Standard error instances
export const errors = {
  badRequest: (message = 'Bad request', details?: any) =>
    new ApiError(ErrorCode.BAD_REQUEST, HttpStatus.BAD_REQUEST, message, details),
  
  unauthorized: (message = 'Unauthorized access') =>
    new ApiError(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, message),
  
  forbidden: (message = 'Access forbidden') =>
    new ApiError(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, message),
  
  notFound: (resource = 'Resource', id?: string) =>
    new ApiError(
      ErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      `${resource}${id ? ` with id '${id}'` : ''} not found`
    ),
  
  validation: (message = 'Validation failed', details?: any) =>
    new ApiError(ErrorCode.VALIDATION_ERROR, HttpStatus.VALIDATION_ERROR, message, details),
  
  conflict: (message = 'Resource conflict', details?: any) =>
    new ApiError(ErrorCode.CONFLICT, HttpStatus.CONFLICT, message, details),
  
  rateLimited: (message = 'Too many requests') =>
    new ApiError(ErrorCode.RATE_LIMITED, HttpStatus.RATE_LIMITED, message),
  
  internal: (message = 'Internal server error', details?: any) =>
    new ApiError(ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_ERROR, message, details),
  
  database: (message = 'Database operation failed', details?: any) =>
    new ApiError(ErrorCode.DATABASE_ERROR, HttpStatus.DATABASE_ERROR, message, details),
  
  externalService: (service: string, message?: string) =>
    new ApiError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      HttpStatus.EXTERNAL_SERVICE_ERROR,
      message || `External service '${service}' is unavailable`
    ),
}

// Error handling middleware for API routes
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R | NextResponse<ApiErrorResponse>> {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Convert common errors to ApiErrors
      if (error instanceof Error) {
        if (error.message.includes('unique constraint')) {
          throw errors.conflict('Resource already exists', { originalError: error.message })
        }
        
        if (error.message.includes('not found')) {
          throw errors.notFound()
        }
        
        if (error.message.includes('unauthorized')) {
          throw errors.unauthorized()
        }
      }
      
      throw errors.internal('Unexpected error occurred', {
        originalError: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

// Validation helper
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      throw error
    }
    throw errors.validation('Invalid request data')
  }
}

// Pagination helper
export function calculatePagination(
  page: number,
  pageSize: number,
  total: number
) {
  const totalPages = Math.ceil(total / pageSize)
  const hasNext = page < totalPages
  const hasPrev = page > 1
  
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev,
    offset: (page - 1) * pageSize,
  }
}

// Request ID helper for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Rate limiting helper
export function checkRateLimit(
  _identifier: string,
  _limit: number,
  _windowMs: number
): boolean {
  // This would integrate with Redis in a real implementation
  // For now, return true (no limit)
  return true
}

// Authorization helpers
export function requireAuth(request: Request): string {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw errors.unauthorized('Missing or invalid authorization header')
  }
  
  return authHeader.substring(7)
}

export function requireRole(userRole: string, requiredRoles: string[]): void {
  if (!requiredRoles.includes(userRole)) {
    throw errors.forbidden(`Insufficient permissions. Required: ${requiredRoles.join(' or ')}`)
  }
}

// Database transaction helper
export async function withTransaction<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    // This would start a database transaction in a real implementation
    const result = await operation()
    // Commit transaction
    return result
  } catch (error) {
    // Rollback transaction
    throw errors.database('Transaction failed', { originalError: error })
  }
}

// Type guards
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError
}

export function isValidationError(error: any): error is ZodError {
  return error instanceof ZodError
}

// Types are already exported above as interfaces