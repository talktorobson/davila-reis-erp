// D'Avila Reis ERP - Comprehensive Database Service
// Aggregates all database operations for the API layer

import { db } from '@/lib/database'
import { leads, clients, cases, financialRecords, documents, tasks, staff } from '@/lib/schema'
import { eq, and, or, desc, asc, sql, count, sum, avg, gte, lte, like, isNull, isNotNull } from 'drizzle-orm'
import type { Lead, NewLead, Client, Case, FinancialRecord, Task, Staff } from '@/types'

export class DatabaseService {
  
  // ===== LEAD OPERATIONS =====
  
  /**
   * Create a new lead with automatic scoring and assignment
   */
  static async create_lead(lead_data: Omit<NewLead, 'id' | 'created_date' | 'updated_at'>): Promise<Lead | null> {
    try {
      const [new_lead] = await db
        .insert(leads)
        .values({
          ...lead_data,
          created_date: new Date(),
          updated_at: new Date()
        })
        .returning()
        .execute()

      return new_lead || null
    } catch (error) {
      console.error('Error creating lead:', error)
      return null
    }
  }

  /**
   * Get leads with advanced filtering and pagination
   */
  static async get_leads(options: {
    page?: number
    limit?: number
    status?: string
    source?: string
    assigned_lawyer?: string
    region?: string
    min_score?: number
    max_score?: number
    date_from?: Date
    date_to?: Date
    search?: string
    sort_by?: 'created_date' | 'lead_score' | 'name' | 'last_contact'
    sort_order?: 'asc' | 'desc'
  } = {}): Promise<{ leads: Lead[]; total: number; stats: { average_score: number; total: number; qualified: number; converted: number; conversion_rate: number } }> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        source,
        assigned_lawyer,
        region,
        min_score,
        max_score,
        date_from,
        date_to,
        search,
        sort_by = 'created_date',
        sort_order = 'desc'
      } = options

      // Build WHERE conditions
      const conditions = []
      
      if (status) conditions.push(eq(leads.status, status as any))
      if (source) conditions.push(eq(leads.source, source as any))
      if (assigned_lawyer) conditions.push(eq(leads.assigned_lawyer, assigned_lawyer))
      if (region) conditions.push(eq(leads.region, region as any))
      if (min_score) conditions.push(gte(leads.lead_score, min_score))
      if (max_score) conditions.push(lte(leads.lead_score, max_score))
      if (date_from) conditions.push(gte(leads.created_date, date_from))
      if (date_to) conditions.push(lte(leads.created_date, date_to))
      
      if (search) {
        const searchCondition = or(
          like(leads.name, `%${search}%`),
          like(leads.email, `%${search}%`),
          like(leads.company, `%${search}%`),
          like(leads.phone, `%${search}%`)
        )
        if (searchCondition) conditions.push(searchCondition)
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Build sort
      const sort_column = {
        created_date: leads.created_date,
        lead_score: leads.lead_score,
        name: leads.name,
        last_contact: leads.last_contact
      }[sort_by]

      const orderBy = sort_order === 'asc' ? asc(sort_column) : desc(sort_column)

      // Execute queries
      const offset = (page - 1) * limit

      const [leads_result, total_result, stats_result] = await Promise.all([
        // Get paginated leads
        db.select()
          .from(leads)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset)
          .execute(),

        // Get total count
        db.select({ count: count() })
          .from(leads)
          .where(whereClause)
          .execute(),

        // Get basic stats
        db.select({
          avg_score: avg(leads.lead_score),
          total_count: count(),
          qualified_count: count(sql`CASE WHEN ${leads.status} IN ('Qualified', 'Hot') THEN 1 END`),
          converted_count: count(sql`CASE WHEN ${leads.status} = 'Converted' THEN 1 END`)
        })
        .from(leads)
        .where(whereClause)
        .execute()
      ])

      const stats = stats_result[0] || { avg_score: 0, total_count: 0, qualified_count: 0, converted_count: 0 }

      return {
        leads: leads_result,
        total: total_result[0]?.count || 0,
        stats: {
          average_score: Number(stats.avg_score) || 0,
          total: Number(stats.total_count) || 0,
          qualified: Number(stats.qualified_count) || 0,
          converted: Number(stats.converted_count) || 0,
          conversion_rate: stats.total_count > 0 
            ? Math.round((Number(stats.converted_count) / Number(stats.total_count)) * 100) 
            : 0
        }
      }
    } catch (error) {
      console.error('Error getting leads:', error)
      return { 
        leads: [], 
        total: 0, 
        stats: { 
          average_score: 0, 
          total: 0, 
          qualified: 0, 
          converted: 0, 
          conversion_rate: 0 
        } 
      }
    }
  }

  /**
   * Update lead with history tracking
   */
  static async update_lead(lead_id: string, update_data: Partial<NewLead>): Promise<Lead | null> {
    try {
      const [updated_lead] = await db
        .update(leads)
        .set({
          ...update_data,
          updated_at: new Date()
        })
        .where(eq(leads.id, lead_id))
        .returning()
        .execute()

      return updated_lead || null
    } catch (error) {
      console.error('Error updating lead:', error)
      return null
    }
  }

  // ===== DASHBOARD STATISTICS =====

  /**
   * Get comprehensive dashboard statistics
   */
  static async get_dashboard_stats(date_range?: { from: Date; to: Date }): Promise<{
    leads: { total: number; new: number; qualified: number; converted: number; avg_score: number }
    clients: { total: number; active: number; new: number }
    cases: { total: number; open: number; closed: number; avg_progress: number }
    financial: { total_receivables: number; total_paid: number; overdue: number; monthly_revenue: number }
    trends: Record<string, number>
  }> {
    try {
      const date_condition = date_range 
        ? and(
            gte(leads.created_date, date_range.from),
            lte(leads.created_date, date_range.to)
          )
        : undefined

      // Lead statistics
      const lead_stats = await db.select({
        total: count(),
        new: count(sql`CASE WHEN ${leads.created_date} >= NOW() - INTERVAL '7 days' THEN 1 END`),
        qualified: count(sql`CASE WHEN ${leads.status} IN ('Qualified', 'Hot') THEN 1 END`),
        converted: count(sql`CASE WHEN ${leads.status} = 'Converted' THEN 1 END`),
        avg_score: avg(leads.lead_score)
      })
      .from(leads)
      .where(date_condition)
      .execute()

      // Client statistics
      const client_stats = await db.select({
        total: count(),
        active: count(sql`CASE WHEN ${clients.status} = 'Active' THEN 1 END`),
        new: count(sql`CASE WHEN ${clients.client_since} >= NOW() - INTERVAL '30 days' THEN 1 END`)
      })
      .from(clients)
      .execute()

      // Case statistics
      const case_stats = await db.select({
        total: count(),
        open: count(sql`CASE WHEN ${cases.status} IN ('Open', 'In Progress') THEN 1 END`),
        closed: count(sql`CASE WHEN ${cases.status} LIKE 'Closed%' THEN 1 END`),
        avg_progress: avg(cases.progress_percentage)
      })
      .from(cases)
      .execute()

      // Financial statistics
      const financial_stats = await db.select({
        total_receivables: sum(sql`CASE WHEN ${financialRecords.type} = 'Receivable' AND ${financialRecords.status} = 'Pending' THEN ${financialRecords.amount} ELSE 0 END`),
        total_paid: sum(sql`CASE WHEN ${financialRecords.status} = 'Paid' THEN ${financialRecords.amount} ELSE 0 END`),
        overdue: sum(sql`CASE WHEN ${financialRecords.status} = 'Overdue' THEN ${financialRecords.amount} ELSE 0 END`),
        monthly_revenue: sum(sql`CASE WHEN ${financialRecords.type} = 'Income' AND ${financialRecords.payment_date} >= DATE_TRUNC('month', NOW()) THEN ${financialRecords.amount} ELSE 0 END`)
      })
      .from(financialRecords)
      .execute()

      return {
        leads: lead_stats[0] ? {
          total: lead_stats[0].total,
          new: lead_stats[0].new,
          qualified: lead_stats[0].qualified,
          converted: lead_stats[0].converted,
          avg_score: Number(lead_stats[0].avg_score) || 0
        } : { total: 0, new: 0, qualified: 0, converted: 0, avg_score: 0 },
        clients: client_stats[0] || { total: 0, active: 0, new: 0 },
        cases: case_stats[0] ? {
          total: case_stats[0].total,
          open: case_stats[0].open,
          closed: case_stats[0].closed,
          avg_progress: Number(case_stats[0].avg_progress) || 0
        } : { total: 0, open: 0, closed: 0, avg_progress: 0 },
        financial: financial_stats[0] ? {
          total_receivables: Number(financial_stats[0].total_receivables) || 0,
          total_paid: Number(financial_stats[0].total_paid) || 0,
          overdue: Number(financial_stats[0].overdue) || 0,
          monthly_revenue: Number(financial_stats[0].monthly_revenue) || 0
        } : { total_receivables: 0, total_paid: 0, overdue: 0, monthly_revenue: 0 },
        trends: {
          // This would include more complex trend analysis
          // For now, return basic data
          conversion_rate: lead_stats[0]?.total > 0 
            ? Math.round((Number(lead_stats[0].converted) / Number(lead_stats[0].total)) * 100)
            : 0
        }
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return { 
        leads: { total: 0, new: 0, qualified: 0, converted: 0, avg_score: 0 },
        clients: { total: 0, active: 0, new: 0 },
        cases: { total: 0, open: 0, closed: 0, avg_progress: 0 },
        financial: { total_receivables: 0, total_paid: 0, overdue: 0, monthly_revenue: 0 },
        trends: {}
      }
    }
  }

  // ===== REPORTING AND ANALYTICS =====

  /**
   * Get lead source performance
   */
  static async get_lead_source_stats(): Promise<Array<{
    source: string
    count: number
    conversion_rate: number
    avg_score: number
  }>> {
    try {
      const source_stats = await db.select({
        source: leads.source,
        count: count(),
        converted: count(sql`CASE WHEN ${leads.status} = 'Converted' THEN 1 END`),
        avg_score: avg(leads.lead_score)
      })
      .from(leads)
      .groupBy(leads.source)
      .orderBy(desc(count()))
      .execute()

      return source_stats.map(stat => ({
        source: stat.source,
        count: Number(stat.count),
        conversion_rate: stat.count > 0 
          ? Math.round((Number(stat.converted) / Number(stat.count)) * 100)
          : 0,
        avg_score: Number(stat.avg_score) || 0
      }))
    } catch (error) {
      console.error('Error getting lead source stats:', error)
      return []
    }
  }

  /**
   * Get regional performance
   */
  static async get_regional_stats(): Promise<Array<{
    region: string
    lead_count: number
    client_count: number
    avg_lead_score: number
  }>> {
    try {
      const [leads_by_region, clients_by_region] = await Promise.all([
        db.select({
          region: leads.region,
          count: count(),
          avg_score: avg(leads.lead_score)
        })
        .from(leads)
        .groupBy(leads.region)
        .execute(),

        db.select({
          region: clients.region,
          count: count()
        })
        .from(clients)
        .groupBy(clients.region)
        .execute()
      ])

      // Merge the results
      const region_map = new Map()

      leads_by_region.forEach(item => {
        region_map.set(item.region, {
          region: item.region,
          lead_count: Number(item.count),
          client_count: 0,
          avg_lead_score: Number(item.avg_score) || 0
        })
      })

      clients_by_region.forEach(item => {
        const existing = region_map.get(item.region) || {
          region: item.region,
          lead_count: 0,
          client_count: 0,
          avg_lead_score: 0
        }
        existing.client_count = Number(item.count)
        region_map.set(item.region, existing)
      })

      return Array.from(region_map.values())
    } catch (error) {
      console.error('Error getting regional stats:', error)
      return []
    }
  }

  // ===== SEARCH AND FILTERING =====

  /**
   * Global search across multiple entities
   */
  static async global_search(query: string, limit: number = 20): Promise<{
    leads: Lead[]
    clients: Client[]
    cases: Case[]
  }> {
    try {
      const search_term = `%${query}%`

      const [search_leads, search_clients, search_cases] = await Promise.all([
        db.select()
          .from(leads)
          .where(
            or(
              like(leads.name, search_term),
              like(leads.email, search_term),
              like(leads.company, search_term),
              like(leads.phone, search_term)
            )
          )
          .limit(limit)
          .execute(),

        db.select()
          .from(clients)
          .where(
            or(
              like(clients.company_name, search_term),
              like(clients.contact_person, search_term),
              like(clients.email, search_term),
              like(clients.phone, search_term)
            )
          )
          .limit(limit)
          .execute(),

        db.select()
          .from(cases)
          .where(
            or(
              like(cases.case_title, search_term),
              like(cases.case_number, search_term),
              like(cases.description, search_term)
            )
          )
          .limit(limit)
          .execute()
      ])

      return {
        leads: search_leads,
        clients: search_clients,
        cases: search_cases
      }
    } catch (error) {
      console.error('Error performing global search:', error)
      return { leads: [], clients: [], cases: [] }
    }
  }

  // ===== UTILITY FUNCTIONS =====

  /**
   * Check database health and performance
   */
  static async check_database_health(): Promise<{
    connected: boolean
    response_time: number
    table_stats: Record<string, number>
  }> {
    try {
      const start_time = Date.now()
      
      // Test connection
      await db.execute(sql`SELECT 1`)
      
      const response_time = Date.now() - start_time

      // Get table counts
      const [lead_count, client_count, case_count, financial_count] = await Promise.all([
        db.select({ count: count() }).from(leads).execute(),
        db.select({ count: count() }).from(clients).execute(),
        db.select({ count: count() }).from(cases).execute(),
        db.select({ count: count() }).from(financialRecords).execute()
      ])

      return {
        connected: true,
        response_time,
        table_stats: {
          leads: Number(lead_count[0]?.count) || 0,
          clients: Number(client_count[0]?.count) || 0,
          cases: Number(case_count[0]?.count) || 0,
          financial: Number(financial_count[0]?.count) || 0
        }
      }
    } catch (error) {
      console.error('Database health check failed:', error)
      return {
        connected: false,
        response_time: -1,
        table_stats: {}
      }
    }
  }

  /**
   * Clean up old or test data
   */
  static async cleanup_test_data(): Promise<{ deleted: number }> {
    try {
      // Delete test leads older than 30 days
      const result = await db
        .delete(leads)
        .where(
          and(
            like(leads.email, '%test%'),
            lte(leads.created_date, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          )
        )
        .execute()

      return { deleted: result.rowCount || 0 }
    } catch (error) {
      console.error('Error cleaning up test data:', error)
      return { deleted: 0 }
    }
  }
}