// D'Avila Reis ERP - PostgreSQL Database Configuration

import { Pool, PoolConfig } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { getDatabaseUrl, isProduction, isTest } from './env'
import * as schema from './schema'

// GCP Cloud SQL Database connection configuration with optimizations
const createPoolConfig = (): PoolConfig => {
  const databaseUrl = getDatabaseUrl()
  
  // Check if we have a valid database URL
  if (!databaseUrl) {
    // During build time, return a minimal config to avoid errors
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return {
        host: 'localhost',
        database: 'placeholder',
        user: 'placeholder',
        password: 'placeholder',
        port: 5432
      }
    }
    throw new Error('DATABASE_URL is not configured. Please check your .env.local file.')
  }
  
  // Handle GCP Cloud SQL Unix socket format: postgresql://user:pass@/dbname?host=/cloudsql/instance
  if (databaseUrl.includes('/cloudsql/')) {
    const urlParts = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@\/([^?]+)\?host=(.+)/)
    if (urlParts) {
      const [, user, password, database, host] = urlParts
      return {
        host: host, // Unix socket path
        database,
        user,
        password,
        ssl: false, // Unix sockets don't use SSL
        
        // Optimized connection pool settings for different environments
        max: isProduction ? 15 : isTest ? 5 : 10,
        min: isProduction ? 2 : isTest ? 1 : 1,
        idleTimeoutMillis: isProduction ? 20000 : 30000,
        connectionTimeoutMillis: isProduction ? 3000 : 2000,
        
        // Performance optimizations
        statement_timeout: 30000,
        query_timeout: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 0,
      }
    }
  }
  
  // Handle regular PostgreSQL URLs
  try {
    const url = new URL(databaseUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1), // Remove leading slash
      user: url.username,
      password: url.password,
      ssl: isProduction ? {
        rejectUnauthorized: false // Cloud SQL uses self-signed certificates
      } : false,
      
      // Optimized connection pool settings for different environments
      max: isProduction ? 15 : isTest ? 5 : 10,
      min: isProduction ? 2 : isTest ? 1 : 1,
      idleTimeoutMillis: isProduction ? 20000 : 30000,
      connectionTimeoutMillis: isProduction ? 3000 : 2000,
      
      // Performance optimizations
      statement_timeout: 30000,
      query_timeout: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    }
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${databaseUrl}`)
  }
}

// Lazy initialization of pool
let pool: Pool | null = null
let dbInstance: NodePgDatabase<typeof schema> | null = null

const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool(createPoolConfig())
    
    // Connection event handlers
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err)
    })

    pool.on('connect', () => {
      console.log('Database connected')
    })
  }
  return pool
}

// Create Drizzle instance with lazy initialization
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get: (_, prop) => {
    if (!dbInstance) {
      dbInstance = drizzle(getPool(), { schema })
    }
    return (dbInstance as any)[prop]
  }
})

// Export db as dbReader for read operations (same instance for now)
export const dbReader = db

// Database connection health check
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const poolInstance = getPool()
    const client = await poolInstance.connect()
    await client.query('SELECT NOW()')
    client.release()
    
    return { success: true }
  } catch (error) {
    console.error('Database connection failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

// Graceful shutdown
export async function closeConnections(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    dbInstance = null
  }
}

// Export types
export type Database = NodePgDatabase<typeof schema>