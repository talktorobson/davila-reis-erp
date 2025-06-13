// Enhanced Health Check Endpoint for D'Avila Reis ERP Client Portal
import { NextRequest, NextResponse } from 'next/server'
import { testConnection } from '@/lib/database'
import { logger } from '@/lib/logger'

interface HealthCheck {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  error?: string
  details?: Record<string, unknown>
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  const checks: HealthCheck[] = []
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  try {
    // 1. Database health check
    const dbStart = Date.now()
    try {
      const dbStatus = await testConnection()
      const dbResponseTime = Date.now() - dbStart
      
      if (dbStatus.success) {
        checks.push({
          component: 'database',
          status: 'healthy',
          responseTime: dbResponseTime
        })
        logger.healthCheck('database', 'healthy', dbResponseTime)
      } else {
        checks.push({
          component: 'database',
          status: 'unhealthy',
          responseTime: dbResponseTime,
          error: 'Database connection failed'
        })
        logger.healthCheck('database', 'unhealthy', dbResponseTime, 'Connection failed')
        overallStatus = 'unhealthy'
      }
    } catch (error) {
      checks.push({
        component: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Database connection failed'
      })
      logger.healthCheck('database', 'unhealthy', Date.now() - dbStart, 
        error instanceof Error ? error.message : 'Unknown error')
      overallStatus = 'unhealthy'
    }

    // 2. Memory usage check
    const memoryUsage = process.memoryUsage()
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024
    const memoryLimitMB = 512 // Adjust based on container limits
    
    let memoryStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (memoryUsedMB > memoryLimitMB * 0.9) {
      memoryStatus = 'unhealthy'
      overallStatus = 'unhealthy'
    } else if (memoryUsedMB > memoryLimitMB * 0.75) {
      memoryStatus = 'degraded'
      if (overallStatus === 'healthy') overallStatus = 'degraded'
    }

    checks.push({
      component: 'memory',
      status: memoryStatus,
      responseTime: 0,
      details: {
        usedMB: Math.round(memoryUsedMB),
        limitMB: memoryLimitMB,
        usage: `${Math.round((memoryUsedMB / memoryLimitMB) * 100)}%`
      }
    })
    logger.healthCheck('memory', memoryStatus, 0, 
      memoryStatus !== 'healthy' ? `Memory usage: ${memoryUsedMB}MB` : undefined)

    // 3. Environment variables check
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    const envStatus: 'healthy' | 'unhealthy' = missingEnvVars.length === 0 ? 'healthy' : 'unhealthy'
    
    if (envStatus === 'unhealthy') {
      overallStatus = 'unhealthy'
    }

    checks.push({
      component: 'environment',
      status: envStatus,
      responseTime: 0,
      error: missingEnvVars.length > 0 ? `Missing: ${missingEnvVars.join(', ')}` : undefined
    })
    logger.healthCheck('environment', envStatus, 0, 
      missingEnvVars.length > 0 ? `Missing env vars: ${missingEnvVars.join(', ')}` : undefined)

    const totalResponseTime = Date.now() - startTime
    
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'davila-reis-erp',
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: totalResponseTime,
      checks,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    }

    // Log overall health status
    logger.healthCheck('system', overallStatus, totalResponseTime)

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(healthData, { status: statusCode })

  } catch (error) {
    logger.error('Health check failed', error as Error)
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'davila-reis-erp',
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: Date.now() - startTime
    }

    return NextResponse.json(errorData, { status: 503 })
  }
}

// Readiness check - more strict than liveness
export async function HEAD() {
  try {
    const dbStatus = await testConnection()
    if (dbStatus.success) {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 })
    }
  } catch (error) {
    logger.error('Readiness check failed', error as Error)
    return new NextResponse(null, { status: 503 })
  }
}