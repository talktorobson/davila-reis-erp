// Redis Client Configuration for D'Avila Reis ERP Client Portal

import Redis from 'ioredis'
import { logger } from './logger'

class RedisClient {
  private client: Redis | null = null
  private isConnected = false

  constructor() {
    this.connect()
  }

  private async connect() {
    try {
      // Only attempt to connect if Redis URL is available
      if (!process.env.REDIS_URL) {
        logger.warn('Redis URL not configured, session management will use memory store')
        return
      }

      this.client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      })

      this.client.on('connect', () => {
        this.isConnected = true
        logger.info('Redis connected successfully')
      })

      this.client.on('error', (error) => {
        this.isConnected = false
        logger.error('Redis connection error', error)
      })

      this.client.on('close', () => {
        this.isConnected = false
        logger.warn('Redis connection closed')
      })

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...')
      })

      await this.client.connect()
    } catch (error) {
      logger.error('Failed to initialize Redis client', error as Error)
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      logger.debug('Redis not available, returning null for key:', { key })
      return null
    }

    try {
      const value = await this.client.get(key)
      logger.debug('Redis GET operation', { key, found: !!value })
      return value
    } catch (error) {
      logger.error('Redis GET operation failed', error as Error, { key })
      return null
    }
  }

  async set(
    key: string, 
    value: string, 
    expireInSeconds?: number
  ): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.debug('Redis not available, skipping SET operation')
      return false
    }

    try {
      if (expireInSeconds) {
        await this.client.setex(key, expireInSeconds, value)
      } else {
        await this.client.set(key, value)
      }
      
      logger.debug('Redis SET operation successful', { 
        key, 
        expire: expireInSeconds 
      })
      return true
    } catch (error) {
      logger.error('Redis SET operation failed', error as Error, { 
        key, 
        expire: expireInSeconds 
      })
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.debug('Redis not available, skipping DEL operation')
      return false
    }

    try {
      const result = await this.client.del(key)
      logger.debug('Redis DEL operation', { key, deleted: result > 0 })
      return result > 0
    } catch (error) {
      logger.error('Redis DEL operation failed', error as Error, { key })
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false
    }

    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Redis EXISTS operation failed', error as Error, { key })
      return false
    }
  }

  async incr(key: string, expireInSeconds?: number): Promise<number | null> {
    if (!this.client || !this.isConnected) {
      return null
    }

    try {
      const result = await this.client.incr(key)
      
      if (expireInSeconds && result === 1) {
        // Set expiration only if this is the first increment
        await this.client.expire(key, expireInSeconds)
      }
      
      return result
    } catch (error) {
      logger.error('Redis INCR operation failed', error as Error, { key })
      return null
    }
  }

  async setObject<T>(
    key: string, 
    object: T, 
    expireInSeconds?: number
  ): Promise<boolean> {
    try {
      const value = JSON.stringify(object)
      return await this.set(key, value, expireInSeconds)
    } catch (error) {
      logger.error('Redis setObject operation failed', error as Error, { key })
      return false
    }
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key)
      if (!value) return null
      
      return JSON.parse(value) as T
    } catch (error) {
      logger.error('Redis getObject operation failed', error as Error, { key })
      return null
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect()
      this.isConnected = false
      logger.info('Redis client disconnected')
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    if (!this.client || !this.isConnected) {
      return { healthy: false }
    }

    try {
      const start = Date.now()
      await this.client.ping()
      const latency = Date.now() - start
      
      return { healthy: true, latency }
    } catch (error) {
      logger.error('Redis health check failed', error as Error)
      return { healthy: false }
    }
  }
}

// Session management utilities
export class SessionManager {
  private redis: RedisClient

  constructor(redisClient: RedisClient) {
    this.redis = redisClient
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`
  }

  private getUserSessionsKey(userId: string): string {
    return `user_sessions:${userId}`
  }

  async createSession(
    sessionId: string, 
    sessionData: any, 
    userId: string,
    maxAge: number = 3600
  ): Promise<boolean> {
    try {
      const sessionKey = this.getSessionKey(sessionId)
      const userSessionsKey = this.getUserSessionsKey(userId)
      
      // Store session data
      const success = await this.redis.setObject(sessionKey, {
        ...sessionData,
        userId,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      }, maxAge)

      if (success) {
        // Add session to user's session list
        await this.redis.set(userSessionsKey, sessionId, maxAge)
        
        logger.audit('Session created', userId, undefined, {
          sessionId,
          maxAge
        })
      }

      return success
    } catch (error) {
      logger.error('Failed to create session', error as Error, {
        sessionId,
        userId
      })
      return false
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
    try {
      const sessionKey = this.getSessionKey(sessionId)
      const sessionData = await this.redis.getObject(sessionKey)

      if (sessionData) {
        // Update last accessed time
        ;(sessionData as any).lastAccessed = new Date().toISOString()
        await this.redis.setObject(sessionKey, sessionData, 3600) // Extend by 1 hour
      }

      return sessionData
    } catch (error) {
      logger.error('Failed to get session', error as Error, { sessionId })
      return null
    }
  }

  async destroySession(sessionId: string, userId?: string): Promise<boolean> {
    try {
      const sessionKey = this.getSessionKey(sessionId)
      const success = await this.redis.del(sessionKey)

      if (userId) {
        const userSessionsKey = this.getUserSessionsKey(userId)
        await this.redis.del(userSessionsKey)
        
        logger.audit('Session destroyed', userId, undefined, { sessionId })
      }

      return success
    } catch (error) {
      logger.error('Failed to destroy session', error as Error, {
        sessionId,
        userId
      })
      return false
    }
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId)
      const sessionId = await this.redis.get(userSessionsKey)

      if (sessionId) {
        await this.destroySession(sessionId, userId)
      }

      logger.audit('All user sessions destroyed', userId)
    } catch (error) {
      logger.error('Failed to destroy all user sessions', error as Error, {
        userId
      })
    }
  }
}

// Rate limiting utilities
export class RateLimiter {
  private redis: RedisClient

  constructor(redisClient: RedisClient) {
    this.redis = redisClient
  }

  private getRateLimitKey(identifier: string, action: string): string {
    return `rate_limit:${action}:${identifier}`
  }

  async checkRateLimit(
    identifier: string,
    action: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getRateLimitKey(identifier, action)
    
    try {
      const current = await this.redis.incr(key, windowSeconds)
      
      if (current === null) {
        // Redis not available, allow request
        return {
          allowed: true,
          remaining: limit - 1,
          resetTime: Date.now() + (windowSeconds * 1000)
        }
      }

      const remaining = Math.max(0, limit - current)
      const allowed = current <= limit

      if (!allowed) {
        logger.security(
          'Rate limit exceeded',
          identifier,
          'system',
          undefined,
          { action, current, limit }
        )
      }

      return {
        allowed,
        remaining,
        resetTime: Date.now() + (windowSeconds * 1000)
      }
    } catch (error) {
      logger.error('Rate limit check failed', error as Error, {
        identifier,
        action
      })
      
      // On error, allow the request
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: Date.now() + (windowSeconds * 1000)
      }
    }
  }
}

// Export singleton instances
export const redisClient = new RedisClient()
export const sessionManager = new SessionManager(redisClient)
export const rateLimiter = new RateLimiter(redisClient)

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Gracefully shutting down Redis client...')
  await redisClient.disconnect()
})

process.on('SIGINT', async () => {
  logger.info('Gracefully shutting down Redis client...')
  await redisClient.disconnect()
})