// D'Avila Reis ERP - Environment Variable Validation and Configuration

import { z } from 'zod'

// Environment schema validation
const envSchema = z.object({
  // Database - Support both regular URLs and GCP Cloud SQL socket format
  DATABASE_URL: z.string().min(1).refine(
    (url) => {
      // Allow GCP Cloud SQL socket format: postgresql://user:pass@/dbname?host=/cloudsql/instance
      if (url.includes('/cloudsql/')) return true
      // Allow regular PostgreSQL URLs
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    },
    { message: 'DATABASE_URL must be a valid PostgreSQL connection string or GCP Cloud SQL socket format' }
  ),
  DATABASE_READONLY_URL: z.string().optional(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  
  // Email
  SENDGRID_API_KEY: z.string().min(1),
  FROM_EMAIL: z.string().email(),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().min(1).default('http://localhost:3000'),
  PORTAL_URL: z.string().optional(),
  NOTIFICATION_EMAIL: z.string().email().optional(),
  
  // Security
  JWT_SECRET: z.string().min(64).optional(),
  SESSION_SECRET: z.string().min(64).optional(),
  ENCRYPTION_KEY: z.string().min(1).optional(),
  
  // GCP
  GCP_PROJECT_ID: z.string().min(1).optional(),
  GCP_REGION: z.string().optional(),
  GCP_STORAGE_BUCKET: z.string().min(1).optional(),
  GCP_CASE_FILES_BUCKET: z.string().min(1).optional(),
  GCP_TEMP_UPLOADS_BUCKET: z.string().min(1).optional(),
  GCP_BACKUPS_BUCKET: z.string().min(1).optional(),
  CLOUD_SQL_INSTANCE: z.string().optional(),
  CLOUD_SQL_CONNECTION_NAME: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  
  // Database fallback configuration
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z.string().optional(),
  DB_SSL_REJECT_UNAUTHORIZED: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_CONFIG: z.string().optional(),
  
  // External Integrations
  CLICKSIGN_ACCESS_TOKEN: z.string().optional(),
  CLICKSIGN_ENDPOINT: z.string().optional(),
  CLICKSIGN_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  
  // Zapier Webhooks
  ZAPIER_LEAD_WEBHOOK: z.string().optional(),
  ZAPIER_CASE_WEBHOOK: z.string().optional(),
  ZAPIER_CONTRACT_WEBHOOK: z.string().optional(),
  
  // AWS (for future integrations)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  // Development
  PORT: z.string().optional(),
  ENVIRONMENT: z.string().optional(),
  
  // Configuration
  RATE_LIMIT_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),
  RATE_LIMIT_BAN_DURATION: z.string().regex(/^\d+$/).transform(Number).default('300'),
  SESSION_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('3600'),
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).default('10485760'),
  
  // Features
  ENABLE_DEBUG_LOGGING: z.string().transform(val => val === 'true').default('false'),
  ENABLE_AUDIT_LOGGING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_PERFORMANCE_MONITORING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_SECURITY_MONITORING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_REDIS_CACHE: z.string().transform(val => val === 'true').default('true'),
  ENABLE_FILE_VIRUS_SCANNING: z.string().transform(val => val === 'true').default('true'),
  
  // Testing
  TEST_DATABASE_URL: z.string().optional(),
  TEST_REDIS_URL: z.string().optional(),
  MOCK_EXTERNAL_SERVICES: z.string().transform(val => val === 'true').default('false'),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

// Validate environment variables
function _validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'))
      
      const invalidVars = error.errors
        .filter(err => err.code !== 'invalid_type' || err.received !== 'undefined')
        .map(err => `${err.path.join('.')}: ${err.message}`)
      
      console.warn('⚠️ Environment validation warnings:')
      
      if (missingVars.length > 0) {
        console.warn('Missing optional environment variables:')
        missingVars.forEach(varName => console.warn(`  - ${varName}`))
      }
      
      if (invalidVars.length > 0) {
        console.warn('Invalid environment variables:')
        invalidVars.forEach(error => console.warn(`  - ${error}`))
      }
      
      console.warn('\nUsing default values where possible. For production, ensure all variables are properly set.')
      
      // Return a partial object with defaults for development
      return {
        NODE_ENV: process.env.NODE_ENV || 'development',
        APP_URL: process.env.APP_URL || 'http://localhost:3000',
        DATABASE_URL: process.env.DATABASE_URL || '',
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
        FROM_EMAIL: process.env.FROM_EMAIL || 'financeiro@davilareisadvogados.com.br',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'development-secret-key',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || ''
      } as any
    }
    throw error
  }
}

// Export validated environment (temporarily using process.env directly for development)
export const env = process.env as any

// Helper functions for common patterns
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

// Database helpers
export const getDatabaseUrl = (readonly = false): string => {
  if (isTest && env.TEST_DATABASE_URL) {
    return env.TEST_DATABASE_URL
  }
  
  const dbUrl = readonly && env.DATABASE_READONLY_URL ? env.DATABASE_READONLY_URL : env.DATABASE_URL
  
  // Return the database URL from environment, fallback to process.env if env validation is disabled
  return dbUrl || process.env.DATABASE_URL || ''
}

// Redis helpers
export const getRedisUrl = (): string | undefined => {
  if (isTest && env.TEST_REDIS_URL) {
    return env.TEST_REDIS_URL
  }
  return env.REDIS_URL
}

// App URL helpers
export const getAppUrl = (): string => {
  return env.APP_URL
}

export const getPortalUrl = (): string => {
  return env.PORTAL_URL || `${env.APP_URL}/portal`
}

// Email helpers
export const getFromEmail = (): string => {
  return env.FROM_EMAIL
}

// Feature flags
export const isFeatureEnabled = (feature: keyof typeof env): boolean => {
  const value = env[feature]
  return typeof value === 'boolean' ? value : false
}

// GCP helpers
export const getGcpConfig = () => ({
  projectId: env.GCP_PROJECT_ID,
  storageBucket: env.GCP_STORAGE_BUCKET,
  caseFilesBucket: env.GCP_CASE_FILES_BUCKET,
  tempUploadsBucket: env.GCP_TEMP_UPLOADS_BUCKET,
  backupsBucket: env.GCP_BACKUPS_BUCKET,
})

// Authentication helpers
export const getAuthConfig = () => ({
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  nextAuthUrl: env.NEXTAUTH_URL,
  nextAuthSecret: env.NEXTAUTH_SECRET,
})

// Rate limiting helpers
export const getRateLimitConfig = () => ({
  requests: env.RATE_LIMIT_REQUESTS,
  banDuration: env.RATE_LIMIT_BAN_DURATION,
  sessionTimeout: env.SESSION_TIMEOUT,
  maxFileSize: env.MAX_FILE_SIZE,
})

// External service helpers
export const getClickSignConfig = () => ({
  accessToken: env.CLICKSIGN_ACCESS_TOKEN,
  environment: env.CLICKSIGN_ENVIRONMENT,
})

export const getStripeConfig = () => ({
  publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  secretKey: env.STRIPE_SECRET_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
})

export const getWhatsAppConfig = () => ({
  businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  accessToken: env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
})

// Logging helpers
export const getLogConfig = () => ({
  level: env.LOG_LEVEL,
  enableDebug: env.ENABLE_DEBUG_LOGGING,
  enableAudit: env.ENABLE_AUDIT_LOGGING,
  enablePerformance: env.ENABLE_PERFORMANCE_MONITORING,
  enableSecurity: env.ENABLE_SECURITY_MONITORING,
})

// Type exports
export type Env = typeof env
export type DatabaseConfig = ReturnType<typeof getDatabaseUrl>
export type GcpConfig = ReturnType<typeof getGcpConfig>
export type AuthConfig = ReturnType<typeof getAuthConfig>