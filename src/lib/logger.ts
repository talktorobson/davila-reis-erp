// Enhanced Logging System for D'Avila Reis ERP Client Portal

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug' | 'security' | 'audit' | 'performance'
  message: string
  service: string
  environment: string
  clientId?: string
  userId?: string
  sessionId?: string
  clientIp?: string
  userAgent?: string
  endpoint?: string
  method?: string
  duration?: number
  statusCode?: number
  error?: {
    message: string
    stack?: string
    code?: string
  }
  metadata?: any
}

class Logger {
  private serviceName = 'davila-reis-portal'
  private environment = process.env.NODE_ENV || 'development'

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    metadata: Partial<LogEntry> = {}
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      environment: this.environment,
      ...metadata
    }
  }

  private writeLog(entry: LogEntry): void {
    // In development, log to console with formatting
    if (this.environment === 'development') {
      const color = this.getLogColor(entry.level)
      console.log(
        `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}\x1b[0m`,
        entry.metadata ? entry.metadata : ''
      )
      return
    }

    // In production, write structured JSON logs
    console.log(JSON.stringify(entry))
  }

  private getLogColor(level: string): string {
    const colors = {
      info: '\x1b[36m',     // Cyan
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      debug: '\x1b[90m',    // Gray
      security: '\x1b[35m', // Magenta
      audit: '\x1b[32m',    // Green
      performance: '\x1b[34m' // Blue
    }
    return colors[level as keyof typeof colors] || '\x1b[0m'
  }

  info(message: string, metadata?: any): void {
    this.writeLog(this.createLogEntry('info', message, { metadata }))
  }

  warn(message: string, metadata?: any): void {
    this.writeLog(this.createLogEntry('warn', message, { metadata }))
  }

  error(message: string, error?: Error, metadata?: any): void {
    const logEntry = this.createLogEntry('error', message, {
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      } : undefined,
      metadata
    })
    this.writeLog(logEntry)
  }

  debug(message: string, metadata?: any): void {
    if (this.environment === 'development') {
      this.writeLog(this.createLogEntry('debug', message, { metadata }))
    }
  }

  security(
    event: string,
    clientIp: string,
    userAgent: string,
    userId?: string,
    metadata?: any
  ): void {
    this.writeLog(this.createLogEntry('security', `Security event: ${event}`, {
      clientIp,
      userAgent,
      userId,
      metadata
    }))
  }

  audit(
    action: string,
    userId: string,
    clientId?: string,
    metadata?: any
  ): void {
    this.writeLog(this.createLogEntry('audit', `Audit: ${action}`, {
      userId,
      clientId,
      metadata
    }))
  }

  performance(
    operation: string,
    duration: number,
    metadata?: any
  ): void {
    this.writeLog(this.createLogEntry('performance', `Performance: ${operation}`, {
      duration,
      metadata
    }))
  }

  // LGPD-compliant data access logging
  dataAccess(
    dataType: string,
    action: 'read' | 'write' | 'delete' | 'export',
    userId: string,
    clientId?: string,
    recordId?: string
  ): void {
    this.audit(`Data ${action}: ${dataType}`, userId, clientId, {
      dataType,
      action,
      recordId,
      compliance: 'LGPD',
      timestamp: new Date().toISOString()
    })
  }

  // API request logging
  apiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    userId?: string,
    clientIp?: string,
    userAgent?: string,
    metadata?: any
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'info'
    this.writeLog(this.createLogEntry(level, `API ${method} ${endpoint}`, {
      method,
      endpoint,
      statusCode,
      duration,
      userId,
      clientIp,
      userAgent,
      metadata
    }))
  }

  // Database operation logging
  dbOperation(
    operation: string,
    table: string,
    duration: number,
    affectedRows?: number,
    error?: Error
  ): void {
    const level = error ? 'error' : 'debug'
    this.writeLog(this.createLogEntry(level, `DB ${operation} on ${table}`, {
      duration,
      metadata: {
        operation,
        table,
        affectedRows
      },
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined
    }))
  }

  // Authentication events
  authEvent(
    event: 'login' | 'logout' | 'token_refresh' | 'password_reset' | 'account_locked',
    userId: string,
    clientIp: string,
    userAgent: string,
    success: boolean = true,
    metadata?: any
  ): void {
    this.security(`Authentication ${event}`, clientIp, userAgent, userId, {
      event,
      success,
      ...metadata
    })
  }

  // File operations
  fileOperation(
    operation: 'upload' | 'download' | 'delete' | 'view',
    fileName: string,
    userId: string,
    clientId?: string,
    fileSize?: number,
    contentType?: string
  ): void {
    this.audit(`File ${operation}: ${fileName}`, userId, clientId, {
      operation,
      fileName,
      fileSize,
      contentType
    })
  }

  // Business process logging
  businessProcess(
    process: string,
    step: string,
    status: 'started' | 'completed' | 'failed',
    userId: string,
    clientId?: string,
    metadata?: any
  ): void {
    this.info(`Business process ${process} - ${step}: ${status}`, {
      process,
      step,
      status,
      userId,
      clientId,
      ...metadata
    })
  }

  // System health monitoring
  healthCheck(
    component: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    responseTime?: number,
    error?: string
  ): void {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error'
    this.writeLog(this.createLogEntry(level, `Health check: ${component} is ${status}`, {
      metadata: {
        component,
        status,
        responseTime
      },
      error: error ? { message: error } : undefined
    }))
  }
}

// Export singleton instance
export const logger = new Logger()

// Helper function for measuring performance
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: any
): Promise<T> {
  const start = Date.now()
  return fn().then(
    (result) => {
      const duration = Date.now() - start
      logger.performance(operation, duration, metadata)
      return result
    },
    (error) => {
      const duration = Date.now() - start
      logger.error(`Performance measurement failed for ${operation}`, error, {
        duration,
        ...metadata
      })
      throw error
    }
  )
}

// Middleware for API route logging
export function withApiLogging<T extends any[], R>(
  operation: string,
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const start = Date.now()
    try {
      const result = await handler(...args)
      const duration = Date.now() - start
      logger.performance(`API ${operation}`, duration)
      return result
    } catch (error) {
      const duration = Date.now() - start
      logger.error(`API ${operation} failed`, error as Error, { duration })
      throw error
    }
  }
}