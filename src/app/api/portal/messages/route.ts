// D'Avila Reis ERP - Portal Messages API
// Real-time messaging system with threading, attachments, and notifications

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { 
  clientCommunications, 
  cases, 
  clientNotifications 
} from '@/lib/schema'
import { eq, and, desc, or, isNull, count, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptionsPortal)
  
  try {
    
    if (!session?.user?.client_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const threadId = searchParams.get('threadId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Build filters
    const conditions = [eq(clientCommunications.client_id, session.user.client_id)]

    if (caseId) {
      conditions.push(eq(clientCommunications.case_id, caseId))
    }

    if (threadId) {
      conditions.push(
        or(
          eq(clientCommunications.id, threadId),
          eq(clientCommunications.parent_message_id, threadId)
        )!
      )
    }

    if (unreadOnly) {
      conditions.push(
        and(
          eq(clientCommunications.read_by_recipient, false),
          eq(clientCommunications.recipient_type, 'client')
        )!
      )
    }

    // Execute main query
    const messages = await db
      .select({
        id: clientCommunications.id,
        client_id: clientCommunications.client_id,
        case_id: clientCommunications.case_id,
        sender_type: clientCommunications.sender_type,
        sender_id: clientCommunications.sender_id,
        recipient_type: clientCommunications.recipient_type,
        recipient_id: clientCommunications.recipient_id,
        subject: clientCommunications.subject,
        message: clientCommunications.message,
        attachments: clientCommunications.attachments,
        read_by_recipient: clientCommunications.read_by_recipient,
        read_at: clientCommunications.read_at,
        priority: clientCommunications.priority,
        message_type: clientCommunications.message_type,
        parent_message_id: clientCommunications.parent_message_id,
        created_at: clientCommunications.created_at,
        // Case information when available
        case_number: cases.case_number,
        case_title: cases.case_title
      })
      .from(clientCommunications)
      .leftJoin(cases, eq(clientCommunications.case_id, cases.id))
      .where(and(...conditions))
      .orderBy(desc(clientCommunications.created_at))
      .limit(limit)
      .offset(offset)

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(clientCommunications)
      .leftJoin(cases, eq(clientCommunications.case_id, cases.id))
      .where(and(...conditions))

    const total = totalResult.count

    // Get unread message count
    const [unreadResult] = await db
      .select({ count: count() })
      .from(clientCommunications)
      .where(and(
        eq(clientCommunications.client_id, session.user.client_id),
        eq(clientCommunications.read_by_recipient, false),
        eq(clientCommunications.recipient_type, 'client')
      ))

    const unreadCount = unreadResult.count

    // Get message threads (group by parent or self if no parent)
    const threads = await db
      .select({
        thread_id: sql<string>`COALESCE(${clientCommunications.parent_message_id}, ${clientCommunications.id})`,
        last_message: sql<string>`MAX(${clientCommunications.created_at})`,
        message_count: count(),
        unread_count: sql<number>`COUNT(CASE WHEN ${clientCommunications.read_by_recipient} = false AND ${clientCommunications.recipient_type} = 'client' THEN 1 END)::int`,
        last_subject: sql<string>`(
          SELECT subject FROM ${clientCommunications} c2 
          WHERE COALESCE(c2.parent_message_id, c2.id) = COALESCE(${clientCommunications.parent_message_id}, ${clientCommunications.id})
          ORDER BY c2.created_at DESC LIMIT 1
        )`,
        case_id: sql<string>`(
          SELECT case_id FROM ${clientCommunications} c3 
          WHERE COALESCE(c3.parent_message_id, c3.id) = COALESCE(${clientCommunications.parent_message_id}, ${clientCommunications.id})
          ORDER BY c3.created_at DESC LIMIT 1
        )`
      })
      .from(clientCommunications)
      .where(eq(clientCommunications.client_id, session.user.client_id))
      .groupBy(sql`COALESCE(${clientCommunications.parent_message_id}, ${clientCommunications.id})`)
      .orderBy(sql`MAX(${clientCommunications.created_at}) DESC`)
      .limit(10)

    logger.info('Portal messages fetched successfully', {
      clientId: session.user.client_id,
      userId: session.user.id,
      filters: { caseId, threadId, unreadOnly },
      resultCount: messages.length,
      unreadCount
    })

    return NextResponse.json({
      success: true,
      data: {
        messages,
        threads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1
        },
        summary: {
          totalMessages: total,
          unreadMessages: unreadCount,
          activeThreads: threads.length
        }
      },
      fetchedAt: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Error fetching portal messages', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptionsPortal)
  
  try {
    
    if (!session?.user?.client_id || !session?.user?.portal_user_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      subject, 
      message, 
      caseId, 
      priority = 'Medium', 
      parentMessageId,
      recipientType = 'lawyer',
      recipientId
    } = body

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }

    if (!subject && !parentMessageId) {
      return NextResponse.json(
        { success: false, error: 'Assunto é obrigatório para novas conversas' },
        { status: 400 }
      )
    }

    // Verify case access if caseId provided
    if (caseId) {
      const [caseExists] = await db
        .select({ id: cases.id })
        .from(cases)
        .where(and(
          eq(cases.id, caseId),
          eq(cases.client_id, session.user.client_id)
        ))

      if (!caseExists) {
        return NextResponse.json(
          { success: false, error: 'Processo não encontrado' },
          { status: 404 }
        )
      }
    }

    // Create the message
    const newMessageResults = await db
      .insert(clientCommunications)
      .values({
        client_id: session.user.client_id,
        case_id: caseId || null,
        sender_type: 'client',
        sender_id: session.user.portal_user_id,
        recipient_type: recipientType as 'client' | 'lawyer' | 'staff',
        recipient_id: recipientId || 'system', // Default to system if no specific recipient
        subject: subject || null,
        message,
        priority: priority as 'Low' | 'Medium' | 'High' | 'Urgent',
        message_type: 'message',
        parent_message_id: parentMessageId || null,
        read_by_recipient: false
      })
      .returning()
    
    // Type-safe extraction of the first result
    const newMessage = Array.isArray(newMessageResults) && newMessageResults.length > 0 
      ? newMessageResults[0] 
      : null

    if (!newMessage) {
      return NextResponse.json(
        { success: false, error: 'Erro ao criar mensagem' },
        { status: 500 }
      )
    }

    // Create notification for staff
    await db.insert(clientNotifications).values({
      client_id: session.user.client_id,
      title: `Nova mensagem: ${subject || 'Resposta'}`,
      message: `Mensagem recebida de ${session.user.name || session.user.email}`,
      type: 'message',
      action_url: `/portal/messages/${newMessage.id}`,
      metadata: {
        messageId: newMessage.id,
        senderId: session.user.portal_user_id,
        caseId: caseId || null
      }
    })

    // TODO: Send email notification to assigned lawyer
    // TODO: Send push notification if enabled

    logger.info('Message sent successfully', {
      messageId: newMessage.id,
      clientId: session.user.client_id,
      userId: session.user.id,
      caseId: caseId || null,
      hasParent: !!parentMessageId,
      priority
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newMessage.id,
        subject: newMessage.subject,
        message: newMessage.message,
        priority: newMessage.priority,
        createdAt: newMessage.created_at,
        caseId: newMessage.case_id,
        parentMessageId: newMessage.parent_message_id
      },
      message: 'Mensagem enviada com sucesso'
    })
    
  } catch (error) {
    logger.error('Error sending message', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}