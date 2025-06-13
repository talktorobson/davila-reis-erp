// D'Avila Reis ERP - Portal Service Layer
// Business logic layer for portal operations with caching and optimization

import { db } from '@/lib/database'
import { 
  cases, 
  documents, 
  financialRecords, 
  clientCommunications, 
  documentAccessLogs
} from '@/lib/schema'
import { eq, and, desc, sql, count, or, isNull } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { redisClient as cache } from '@/lib/redis'

export interface PortalUser {
  id: string
  client_id: string
  email: string
  role: 'client'
  portal_user_id: string
}

export interface DashboardMetrics {
  cases: {
    total: number
    active: number
    waiting: number
    closed: number
    average_progress: number
    overdue: number
  }
  financial: {
    total_amount: number
    pending_amount: number
    paid_amount: number
    overdue_amount: number
    overdue_count: number
  }
  documents: {
    total: number
    recent: number
    pending_signatures: number
  }
  communications: {
    total_messages: number
    unread_messages: number
  }
}

export class PortalService {
  private client_id: string
  private user_id: string

  constructor(client_id: string, user_id: string) {
    this.client_id = client_id
    this.user_id = user_id
  }

  // Dashboard metrics with caching
  async getDashboardMetrics(use_cache: boolean = true): Promise<DashboardMetrics> {
    const cache_key = `dashboard:${this.client_id}`
    
    if (use_cache) {
      const cached = await cache.getObject<DashboardMetrics>(cache_key)
      if (cached) {
        logger.info('Dashboard metrics served from cache', { client_id: this.client_id })
        return cached
      }
    }

    try {
      // Get case metrics
      const [case_metrics] = await db
        .select({
          total: count(),
          active: sql<number>`COUNT(CASE WHEN status IN ('Open', 'In Progress') THEN 1 END)::int`,
          waiting: sql<number>`COUNT(CASE WHEN status IN ('Waiting Client', 'Waiting Court') THEN 1 END)::int`,
          closed: sql<number>`COUNT(CASE WHEN status IN ('Closed - Won', 'Closed - Lost') THEN 1 END)::int`,
          average_progress: sql<number>`COALESCE(AVG(progress_percentage), 0)::int`,
          overdue: sql<number>`COUNT(CASE WHEN due_date < NOW() AND status NOT IN ('Closed - Won', 'Closed - Lost', 'Cancelled') THEN 1 END)::int`
        })
        .from(cases)
        .where(eq(cases.client_id, this.client_id))

      // Get financial metrics
      const [financial_metrics] = await db
        .select({
          total_amount: sql<number>`COALESCE(SUM(total_with_tax), 0)::numeric`,
          pending_amount: sql<number>`COALESCE(SUM(CASE WHEN status = 'Pending' THEN total_with_tax ELSE 0 END), 0)::numeric`,
          paid_amount: sql<number>`COALESCE(SUM(CASE WHEN status = 'Paid' THEN total_with_tax ELSE 0 END), 0)::numeric`,
          overdue_amount: sql<number>`COALESCE(SUM(CASE WHEN status = 'Overdue' THEN total_with_tax ELSE 0 END), 0)::numeric`,
          overdue_count: sql<number>`COUNT(CASE WHEN status = 'Overdue' THEN 1 END)::int`
        })
        .from(financialRecords)
        .where(and(
          eq(financialRecords.client_id, this.client_id),
          eq(financialRecords.type, 'Invoice')
        ))

      // Get document metrics
      const [document_metrics] = await db
        .select({
          total: count(),
          recent: sql<number>`COUNT(CASE WHEN upload_date >= NOW() - INTERVAL '30 days' THEN 1 END)::int`,
          pending_signatures: sql<number>`COUNT(CASE WHEN signature_required = true AND status != 'Signed' THEN 1 END)::int`
        })
        .from(documents)
        .where(eq(documents.client_id, this.client_id))

      // Get communication metrics
      const [communication_metrics] = await db
        .select({
          total_messages: count(),
          unread_messages: sql<number>`COUNT(CASE WHEN read_by_recipient = false AND recipient_type = 'client' THEN 1 END)::int`
        })
        .from(clientCommunications)
        .where(eq(clientCommunications.client_id, this.client_id))

      const metrics: DashboardMetrics = {
        cases: {
          total: Number(case_metrics.total),
          active: case_metrics.active,
          waiting: case_metrics.waiting,
          closed: case_metrics.closed,
          average_progress: case_metrics.average_progress,
          overdue: case_metrics.overdue
        },
        financial: {
          total_amount: Number(financial_metrics.total_amount),
          pending_amount: Number(financial_metrics.pending_amount),
          paid_amount: Number(financial_metrics.paid_amount),
          overdue_amount: Number(financial_metrics.overdue_amount),
          overdue_count: financial_metrics.overdue_count
        },
        documents: {
          total: Number(document_metrics.total),
          recent: document_metrics.recent,
          pending_signatures: document_metrics.pending_signatures
        },
        communications: {
          total_messages: Number(communication_metrics.total_messages),
          unread_messages: communication_metrics.unread_messages
        }
      }

      // Cache for 5 minutes
      await cache.setObject(cache_key, metrics, 300)

      logger.info('Dashboard metrics calculated and cached', { 
        client_id: this.client_id,
        metrics: {
          total_cases: metrics.cases.total,
          total_documents: metrics.documents.total,
          unread_messages: metrics.communications.unread_messages
        }
      })

      return metrics

    } catch (error) {
      logger.error('Error calculating dashboard metrics', error as Error, {
        client_id: this.client_id,
        user_id: this.user_id
      })
      throw error
    }
  }

  // Case operations
  async get_cases(filters: {
    status?: string
    priority?: string
    search?: string
    page?: number
    limit?: number
  } = {}) {
    const { page = 1, limit = 10, status, priority, search } = filters
    const offset = (page - 1) * limit

    try {
      const query = db
        .select({
          id: cases.id,
          case_number: cases.case_number,
          case_title: cases.case_title,
          service_type: cases.service_type,
          status: cases.status,
          priority: cases.priority,
          assigned_lawyer: cases.assigned_lawyer,
          start_date: cases.start_date,
          due_date: cases.due_date,
          progress_percentage: cases.progress_percentage,
          total_value: cases.total_value,
          updated_at: cases.updated_at
        })
        .from(cases)

      const conditions = [eq(cases.client_id, this.client_id)]

      if (status) conditions.push(eq(cases.status, status as any))
      if (priority) conditions.push(eq(cases.priority, priority as any))
      if (search) {
        const searchCondition = or(
          sql`${cases.case_title} ILIKE ${`%${search}%`}`,
          sql`${cases.case_number} ILIKE ${`%${search}%`}`
        )
        if (searchCondition) {
          conditions.push(searchCondition)
        }
      }

      const result = await query
        .where(and(...conditions))
        .orderBy(desc(cases.updated_at))
        .limit(limit)
        .offset(offset)

      const [totalResult] = await db
        .select({ count: count() })
        .from(cases)
        .where(and(...conditions))

      return {
        cases: result,
        pagination: {
          page,
          limit,
          total: Number(totalResult.count),
          total_pages: Math.ceil(Number(totalResult.count) / limit)
        }
      }

    } catch (error) {
      logger.error('Error fetching cases', error as Error, {
        client_id: this.client_id,
        filters
      })
      throw error
    }
  }

  // Document operations with access logging
  async get_documents(filters: {
    case_id?: string
    type?: string
    page?: number
    limit?: number
  } = {}) {
    const { page = 1, limit = 20, case_id, type } = filters
    const offset = (page - 1) * limit

    try {
      const query = db
        .select({
          id: documents.id,
          document_name: documents.document_name,
          document_type: documents.document_type,
          file_size: documents.file_size,
          access_level: documents.access_level,
          status: documents.status,
          upload_date: documents.upload_date,
          case_id: documents.case_id
        })
        .from(documents)

      const conditions = [
        eq(documents.client_id, this.client_id),
        or(
          eq(documents.access_level, 'Client Only'),
          eq(documents.access_level, 'Public')
        )
      ]

      if (case_id) conditions.push(eq(documents.case_id, case_id))
      if (type) conditions.push(eq(documents.document_type, type))

      const result = await query
        .where(and(...conditions))
        .orderBy(desc(documents.upload_date))
        .limit(limit)
        .offset(offset)

      const [totalResult] = await db
        .select({ count: count() })
        .from(documents)
        .where(and(...conditions))

      return {
        documents: result,
        pagination: {
          page,
          limit,
          total: Number(totalResult.count),
          total_pages: Math.ceil(Number(totalResult.count) / limit)
        }
      }

    } catch (error) {
      logger.error('Error fetching documents', error as Error, {
        client_id: this.client_id,
        filters
      })
      throw error
    }
  }

  // Log document access for LGPD compliance
  async log_document_access(
    document_id: string,
    action: 'view' | 'download' | 'preview',
    metadata: {
      ip_address?: string
      user_agent?: string
      success: boolean
      error_message?: string
    }
  ) {
    try {
      await db.insert(documentAccessLogs).values({
        document_id,
        client_id: this.client_id,
        user_id: this.user_id,
        action,
        ip_address: metadata.ip_address || 'unknown',
        user_agent: metadata.user_agent || 'unknown',
        success: metadata.success,
        error_message: metadata.error_message
      })

      logger.info('Document access logged', {
        document_id,
        client_id: this.client_id,
        user_id: this.user_id,
        action,
        success: metadata.success
      })

    } catch (error) {
      logger.error('Error logging document access', error as Error, {
        document_id,
        client_id: this.client_id,
        action
      })
      // Don't throw here as it shouldn't break the main flow
    }
  }

  // Message operations
  async get_messages(filters: {
    case_id?: string
    unread_only?: boolean
    page?: number
    limit?: number
  } = {}) {
    const { page = 1, limit = 20, case_id, unread_only } = filters
    const offset = (page - 1) * limit

    try {
      const query = db
        .select({
          id: clientCommunications.id,
          subject: clientCommunications.subject,
          message: clientCommunications.message,
          sender_type: clientCommunications.sender_type,
          priority: clientCommunications.priority,
          read_by_recipient: clientCommunications.read_by_recipient,
          created_at: clientCommunications.created_at,
          case_id: clientCommunications.case_id
        })
        .from(clientCommunications)

      const conditions = [eq(clientCommunications.client_id, this.client_id)]

      if (case_id) conditions.push(eq(clientCommunications.case_id, case_id))
      if (unread_only) {
        const unreadCondition = and(
          eq(clientCommunications.read_by_recipient, false),
          eq(clientCommunications.recipient_type, 'client')
        )
        if (unreadCondition) {
          conditions.push(unreadCondition)
        }
      }

      const result = await query
        .where(and(...conditions))
        .orderBy(desc(clientCommunications.created_at))
        .limit(limit)
        .offset(offset)

      const [totalResult] = await db
        .select({ count: count() })
        .from(clientCommunications)
        .where(and(...conditions))

      return {
        messages: result,
        pagination: {
          page,
          limit,
          total: Number(totalResult.count),
          total_pages: Math.ceil(Number(totalResult.count) / limit)
        }
      }

    } catch (error) {
      logger.error('Error fetching messages', error as Error, {
        client_id: this.client_id,
        filters
      })
      throw error
    }
  }

  // Invalidate cache when data changes
  async invalidate_cache(keys?: string[]) {
    const default_keys = [
      `dashboard:${this.client_id}`,
      `cases:${this.client_id}`,
      `documents:${this.client_id}`,
      `messages:${this.client_id}`
    ]

    const keys_to_invalidate = keys || default_keys

    try {
      await Promise.all(keys_to_invalidate.map(key => cache.del(key)))
      
      logger.info('Cache invalidated', {
        client_id: this.client_id,
        keys: keys_to_invalidate
      })

    } catch (error) {
      logger.error('Error invalidating cache', error as Error, {
        client_id: this.client_id,
        keys: keys_to_invalidate
      })
    }
  }
}

export default PortalService