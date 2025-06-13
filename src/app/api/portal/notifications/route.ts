// D'Avila Reis ERP - Portal Notifications API
// Real-time notification management with read status and filtering

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { clientNotifications } from '@/lib/schema'
import { eq, and, desc, count, or, isNull, gt, sql, inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsPortal)
    
    if (!session?.user?.client_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Base query
    const query = db
      .select({
        id: clientNotifications.id,
        title: clientNotifications.title,
        message: clientNotifications.message,
        type: clientNotifications.type,
        read: clientNotifications.read,
        read_at: clientNotifications.read_at,
        action_url: clientNotifications.action_url,
        metadata: clientNotifications.metadata,
        expires_at: clientNotifications.expires_at,
        created_at: clientNotifications.created_at
      })
      .from(clientNotifications)

    // Apply filters
    const conditions = [eq(clientNotifications.client_id, session.user.client_id)]

    if (unreadOnly) {
      conditions.push(eq(clientNotifications.read, false))
    }

    if (type) {
      conditions.push(eq(clientNotifications.type, type as 'info' | 'success' | 'warning' | 'error' | 'case_update' | 'document' | 'payment' | 'message'))
    }

    // Check for unexpired notifications
    const now = new Date()
    conditions.push(
      or(
        isNull(clientNotifications.expires_at),
        gt(clientNotifications.expires_at, now)
      )!
    )

    const finalQuery = query
      .where(and(...conditions))
      .orderBy(desc(clientNotifications.created_at))
      .limit(limit)
      .offset(offset)

    const notifications = await finalQuery

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(clientNotifications)
      .where(and(...conditions))

    const total = totalResult.count

    // Get unread count
    const [unreadResult] = await db
      .select({ count: count() })
      .from(clientNotifications)
      .where(and(
        eq(clientNotifications.client_id, session.user.client_id),
        eq(clientNotifications.read, false),
        or(
          isNull(clientNotifications.expires_at),
          gt(clientNotifications.expires_at, now)
        )
      ))

    const unreadCount = unreadResult.count

    // Get notification summary by type
    const typeSummary = await db
      .select({
        type: clientNotifications.type,
        count: count(),
        unread_count: sql<number>`COUNT(CASE WHEN read = false THEN 1 END)::int`
      })
      .from(clientNotifications)
      .where(and(
        eq(clientNotifications.client_id, session.user.client_id),
        or(
          isNull(clientNotifications.expires_at),
          gt(clientNotifications.expires_at, now)
        )
      ))
      .groupBy(clientNotifications.type)
      .orderBy(desc(count()))

    logger.info('Portal notifications fetched successfully', {
      clientId: session.user.client_id,
      userId: session.user.id,
      resultCount: notifications.length,
      unreadCount,
      filters: { unreadOnly, type }
    })

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        summary: {
          total,
          unread: unreadCount,
          read: total - unreadCount,
          byType: typeSummary
        }
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      },
      fetchedAt: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Error fetching portal notifications', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsPortal)
    
    if (!session?.user?.client_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, notificationIds } = body

    if (action === 'mark_all_read') {
      // Mark all notifications as read
      const updated = await db
        .update(clientNotifications)
        .set({
          read: true,
          read_at: new Date()
        })
        .where(and(
          eq(clientNotifications.client_id, session.user.client_id),
          eq(clientNotifications.read, false)
        ))
        .returning({ id: clientNotifications.id })

      logger.info('All notifications marked as read', {
        clientId: session.user.client_id,
        userId: session.user.id,
        count: updated.length
      })

      return NextResponse.json({
        success: true,
        data: { updatedCount: updated.length },
        message: 'Todas as notificações foram marcadas como lidas'
      })

    } else if (action === 'mark_read' && notificationIds?.length) {
      // Mark specific notifications as read
      const updated = await db
        .update(clientNotifications)
        .set({
          read: true,
          read_at: new Date()
        })
        .where(and(
          eq(clientNotifications.client_id, session.user.client_id),
          inArray(clientNotifications.id, notificationIds)
        ))
        .returning({ id: clientNotifications.id })

      logger.info('Notifications marked as read', {
        clientId: session.user.client_id,
        userId: session.user.id,
        notificationIds,
        count: updated.length
      })

      return NextResponse.json({
        success: true,
        data: { updatedCount: updated.length },
        message: 'Notificações marcadas como lidas'
      })

    } else {
      return NextResponse.json(
        { success: false, error: 'Ação inválida' },
        { status: 400 }
      )
    }
    
  } catch (error) {
    logger.error('Error updating notifications', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}