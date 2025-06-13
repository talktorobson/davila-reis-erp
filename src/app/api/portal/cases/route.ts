// D'Avila Reis ERP - Portal Cases API
// Comprehensive case management API with filtering, pagination, and real-time updates

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { cases, tasks, documents } from '@/lib/schema'
import { eq, and, desc, asc, sql, or, count } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptionsPortal)
  
  try {
    
    if (!session?.user?.client_id) {
      logger.warn('Unauthorized portal cases access attempt', { 
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const serviceType = searchParams.get('serviceType')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'updated_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const offset = (page - 1) * limit

    // Build filters
    const conditions: Array<ReturnType<typeof eq>> = [eq(cases.client_id, session.user.client_id)]

    if (status) {
      conditions.push(eq(cases.status, status as any))
    }

    if (priority) {
      conditions.push(eq(cases.priority, priority as any))
    }

    if (serviceType) {
      conditions.push(eq(cases.service_type, serviceType))
    }

    if (search) {
      const searchConditions = [
        sql`${cases.case_title} ILIKE ${`%${search}%`}`,
        sql`${cases.case_number} ILIKE ${`%${search}%`}`,
        sql`${cases.description} ILIKE ${`%${search}%`}`,
        sql`${cases.case_number_external} ILIKE ${`%${search}%`}`
      ].filter(Boolean)
      
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions)!)
      }
    }

    // Build sorting
    let sortColumn
    switch (sortBy) {
      case 'case_number':
        sortColumn = cases.case_number
        break
      case 'case_title':
        sortColumn = cases.case_title
        break
      case 'status':
        sortColumn = cases.status
        break
      case 'priority':
        sortColumn = cases.priority
        break
      case 'due_date':
        sortColumn = cases.due_date
        break
      case 'created_at':
        sortColumn = cases.created_at
        break
      default:
        sortColumn = cases.updated_at
    }
    const orderClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

    // Execute main query
    const clientCases = await db
      .select({
        id: cases.id,
        case_number: cases.case_number,
        case_title: cases.case_title,
        service_type: cases.service_type,
        description: cases.description,
        status: cases.status,
        priority: cases.priority,
        assigned_lawyer: cases.assigned_lawyer,
        start_date: cases.start_date,
        due_date: cases.due_date,
        expected_close_date: cases.expected_close_date,
        actual_close_date: cases.actual_close_date,
        progress_percentage: cases.progress_percentage,
        total_value: cases.total_value,
        next_steps: cases.next_steps,
        court_agency: cases.court_agency,
        case_number_external: cases.case_number_external,
        opposing_party: cases.opposing_party,
        risk_level: cases.risk_level,
        key_dates: cases.key_dates,
        outcome: cases.outcome,
        client_satisfaction: cases.client_satisfaction,
        created_at: cases.created_at,
        updated_at: cases.updated_at,
        // Aggregate data
        task_count: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${tasks} t 
          WHERE t.case_id = ${cases.id}
        )`,
        completed_task_count: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${tasks} t 
          WHERE t.case_id = ${cases.id} AND t.status = 'Done'
        )`,
        document_count: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${documents} d 
          WHERE d.case_id = ${cases.id}
        )`,
        overdue_tasks: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${tasks} t 
          WHERE t.case_id = ${cases.id} 
            AND t.due_date < NOW() 
            AND t.status NOT IN ('Done', 'Cancelled')
        )`
      })
      .from(cases)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(cases)
      .where(and(...conditions))

    const total = totalResult.count

    // Calculate summary statistics
    const [statusSummary] = await db
      .select({
        total: count(),
        open: sql<number>`COUNT(CASE WHEN status = 'Open' THEN 1 END)::int`,
        in_progress: sql<number>`COUNT(CASE WHEN status = 'In Progress' THEN 1 END)::int`,
        waiting_client: sql<number>`COUNT(CASE WHEN status = 'Waiting Client' THEN 1 END)::int`,
        waiting_court: sql<number>`COUNT(CASE WHEN status = 'Waiting Court' THEN 1 END)::int`,
        on_hold: sql<number>`COUNT(CASE WHEN status = 'On Hold' THEN 1 END)::int`,
        closed_won: sql<number>`COUNT(CASE WHEN status = 'Closed - Won' THEN 1 END)::int`,
        closed_lost: sql<number>`COUNT(CASE WHEN status = 'Closed - Lost' THEN 1 END)::int`,
        cancelled: sql<number>`COUNT(CASE WHEN status = 'Cancelled' THEN 1 END)::int`,
        overdue: sql<number>`COUNT(CASE WHEN due_date < NOW() AND status NOT IN ('Closed - Won', 'Closed - Lost', 'Cancelled') THEN 1 END)::int`,
        high_priority: sql<number>`COUNT(CASE WHEN priority = 'High' OR priority = 'Urgent' THEN 1 END)::int`
      })
      .from(cases)
      .where(eq(cases.client_id, session.user.client_id))

    logger.info('Portal cases fetched successfully', {
      clientId: session.user.client_id,
      userId: session.user.id,
      filters: { status, priority, serviceType, search },
      pagination: { page, limit },
      resultCount: clientCases.length
    })

    return NextResponse.json({
      success: true,
      data: clientCases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      },
      summary: statusSummary,
      filters: { status, priority, serviceType, search },
      meta: {
        fetchedAt: new Date().toISOString(),
        sortBy,
        sortOrder
      }
    })
    
  } catch (error) {
    logger.error('Error fetching portal cases', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}