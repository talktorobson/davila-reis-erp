// D'Avila Reis ERP - Portal Dashboard API
// Comprehensive dashboard data with metrics, recent activity, and alerts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { 
  cases, 
  documents, 
  financialRecords, 
  clientCommunications, 
  clientNotifications, 
  tasks 
} from '@/lib/schema'
import { eq, and, desc, sql, count, gt } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptionsPortal)
  
  try {
    
    if (!session?.user?.client_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const clientId = session.user.client_id

    // Get case metrics
    const [caseMetrics] = await db
      .select({
        total_cases: count(),
        active_cases: sql<number>`COUNT(CASE WHEN status IN ('Open', 'In Progress') THEN 1 END)::int`,
        waiting_cases: sql<number>`COUNT(CASE WHEN status IN ('Waiting Client', 'Waiting Court') THEN 1 END)::int`,
        on_hold_cases: sql<number>`COUNT(CASE WHEN status = 'On Hold' THEN 1 END)::int`,
        closed_cases: sql<number>`COUNT(CASE WHEN status IN ('Closed - Won', 'Closed - Lost') THEN 1 END)::int`,
        average_progress: sql<number>`COALESCE(AVG(progress_percentage), 0)::int`,
        high_priority_cases: sql<number>`COUNT(CASE WHEN priority IN ('High', 'Urgent') THEN 1 END)::int`,
        overdue_cases: sql<number>`COUNT(CASE WHEN due_date < NOW() AND status NOT IN ('Closed - Won', 'Closed - Lost', 'Cancelled') THEN 1 END)::int`
      })
      .from(cases)
      .where(eq(cases.client_id, clientId))

    // Get financial metrics
    const [financialMetrics] = await db
      .select({
        total_invoices: count(),
        total_amount: sql<number>`COALESCE(SUM(total_with_tax), 0)::numeric`,
        pending_amount: sql<number>`COALESCE(SUM(CASE WHEN status = 'Pending' THEN total_with_tax ELSE 0 END), 0)::numeric`,
        paid_amount: sql<number>`COALESCE(SUM(CASE WHEN status = 'Paid' THEN total_with_tax ELSE 0 END), 0)::numeric`,
        overdue_amount: sql<number>`COALESCE(SUM(CASE WHEN status = 'Overdue' THEN total_with_tax ELSE 0 END), 0)::numeric`,
        overdue_count: sql<number>`COUNT(CASE WHEN status = 'Overdue' THEN 1 END)::int`,
        next_due_date: sql<Date | null>`MIN(CASE WHEN status = 'Pending' AND due_date > NOW() THEN due_date END)`
      })
      .from(financialRecords)
      .where(and(
        eq(financialRecords.client_id, clientId),
        eq(financialRecords.type, 'Invoice')
      ))

    // Get document metrics
    const [documentMetrics] = await db
      .select({
        total_documents: count(),
        recent_documents: sql<number>`COUNT(CASE WHEN upload_date >= NOW() - INTERVAL '30 days' THEN 1 END)::int`,
        pending_signatures: sql<number>`COUNT(CASE WHEN signature_required = true AND status != 'Signed' THEN 1 END)::int`,
        expiring_soon: sql<number>`COUNT(CASE WHEN expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' THEN 1 END)::int`
      })
      .from(documents)
      .where(eq(documents.client_id, clientId))

    // Get communication metrics
    const [communicationMetrics] = await db
      .select({
        total_messages: count(),
        unread_messages: sql<number>`COUNT(CASE WHEN read_by_recipient = false AND recipient_type = 'client' THEN 1 END)::int`,
        recent_messages: sql<number>`COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int`
      })
      .from(clientCommunications)
      .where(eq(clientCommunications.client_id, clientId))

    // Get notification metrics
    const [notificationMetrics] = await db
      .select({
        total_notifications: count(),
        unread_notifications: sql<number>`COUNT(CASE WHEN read = false THEN 1 END)::int`,
        urgent_notifications: sql<number>`COUNT(CASE WHEN type = 'error' AND read = false THEN 1 END)::int`
      })
      .from(clientNotifications)
      .where(eq(clientNotifications.client_id, clientId))

    // Get recent activity (last 7 days)
    const recentCaseUpdates = await db
      .select({
        id: cases.id,
        case_number: cases.case_number,
        case_title: cases.case_title,
        status: cases.status,
        progress_percentage: cases.progress_percentage,
        updated_at: cases.updated_at
      })
      .from(cases)
      .where(and(
        eq(cases.client_id, clientId),
        gt(cases.updated_at, sql`NOW() - INTERVAL '7 days'`)
      ))
      .orderBy(desc(cases.updated_at))
      .limit(5)

    const recentDocuments = await db
      .select({
        id: documents.id,
        document_name: documents.document_name,
        document_type: documents.document_type,
        status: documents.status,
        upload_date: documents.upload_date,
        case_id: documents.case_id
      })
      .from(documents)
      .where(and(
        eq(documents.client_id, clientId),
        gt(documents.upload_date, sql`NOW() - INTERVAL '7 days'`)
      ))
      .orderBy(desc(documents.upload_date))
      .limit(5)

    const recentMessages = await db
      .select({
        id: clientCommunications.id,
        subject: clientCommunications.subject,
        sender_type: clientCommunications.sender_type,
        message_type: clientCommunications.message_type,
        priority: clientCommunications.priority,
        read_by_recipient: clientCommunications.read_by_recipient,
        created_at: clientCommunications.created_at
      })
      .from(clientCommunications)
      .where(and(
        eq(clientCommunications.client_id, clientId),
        gt(clientCommunications.created_at, sql`NOW() - INTERVAL '7 days'`)
      ))
      .orderBy(desc(clientCommunications.created_at))
      .limit(5)

    // Get upcoming deadlines and important dates
    const upcomingDeadlines = await db
      .select({
        type: sql<string>`'case'`,
        id: cases.id,
        title: cases.case_title,
        description: sql<string>`'Prazo do processo'`,
        due_date: cases.due_date,
        priority: cases.priority,
        status: cases.status
      })
      .from(cases)
      .where(and(
        eq(cases.client_id, clientId),
        gt(cases.due_date, sql`NOW()`),
        sql`due_date <= NOW() + INTERVAL '30 days'`,
        sql`status NOT IN ('Closed - Won', 'Closed - Lost', 'Cancelled')`
      ))
      .orderBy(cases.due_date)
      .limit(10)

    const upcomingPayments = await db
      .select({
        type: sql<string>`'payment'`,
        id: financialRecords.id,
        title: financialRecords.description,
        description: sql<string>`'Vencimento de fatura'`,
        due_date: financialRecords.due_date,
        priority: sql<string>`'Medium'`,
        status: financialRecords.status,
        amount: financialRecords.total_with_tax
      })
      .from(financialRecords)
      .where(and(
        eq(financialRecords.client_id, clientId),
        eq(financialRecords.type, 'Invoice'),
        eq(financialRecords.status, 'Pending'),
        gt(financialRecords.due_date, sql`NOW()`),
        sql`due_date <= NOW() + INTERVAL '30 days'`
      ))
      .orderBy(financialRecords.due_date)
      .limit(10)

    // Get alerts and important notifications
    const alerts = []

    // Overdue payments alert
    if (Number(financialMetrics.overdue_amount) > 0) {
      alerts.push({
        type: 'warning',
        title: 'Faturas em Atraso',
        message: `Você possui ${financialMetrics.overdue_count} fatura(s) em atraso totalizando R$ ${Number(financialMetrics.overdue_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        actionUrl: '/portal/financial?status=Overdue'
      })
    }

    // Overdue cases alert
    if (caseMetrics.overdue_cases > 0) {
      alerts.push({
        type: 'error',
        title: 'Processos com Prazo Vencido',
        message: `${caseMetrics.overdue_cases} processo(s) com prazo vencido requerem atenção`,
        actionUrl: '/portal/cases?overdue=true'
      })
    }

    // Unread messages alert
    if (communicationMetrics.unread_messages > 0) {
      alerts.push({
        type: 'info',
        title: 'Mensagens Não Lidas',
        message: `Você tem ${communicationMetrics.unread_messages} mensagem(ns) não lida(s)`,
        actionUrl: '/portal/messages?unreadOnly=true'
      })
    }

    // Pending signatures alert
    if (documentMetrics.pending_signatures > 0) {
      alerts.push({
        type: 'warning',
        title: 'Documentos Aguardando Assinatura',
        message: `${documentMetrics.pending_signatures} documento(s) aguardando sua assinatura`,
        actionUrl: '/portal/documents?status=Under Review'
      })
    }

    logger.info('Dashboard data fetched successfully', {
      clientId,
      userId: session.user.id,
      metrics: {
        cases: caseMetrics.total_cases,
        documents: documentMetrics.total_documents,
        unreadMessages: communicationMetrics.unread_messages,
        alerts: alerts.length
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          cases: {
            total: caseMetrics.total_cases,
            active: caseMetrics.active_cases,
            waiting: caseMetrics.waiting_cases,
            onHold: caseMetrics.on_hold_cases,
            closed: caseMetrics.closed_cases,
            averageProgress: caseMetrics.average_progress,
            highPriority: caseMetrics.high_priority_cases,
            overdue: caseMetrics.overdue_cases
          },
          financial: {
            totalInvoices: Number(financialMetrics.total_invoices),
            totalAmount: Number(financialMetrics.total_amount),
            pendingAmount: Number(financialMetrics.pending_amount),
            paidAmount: Number(financialMetrics.paid_amount),
            overdueAmount: Number(financialMetrics.overdue_amount),
            overdueCount: financialMetrics.overdue_count,
            nextDueDate: financialMetrics.next_due_date,
            paymentRate: Number(financialMetrics.total_invoices) > 0 
              ? Math.round((Number(financialMetrics.paid_amount) / Number(financialMetrics.total_amount)) * 100)
              : 0
          },
          documents: {
            total: documentMetrics.total_documents,
            recent: documentMetrics.recent_documents,
            pendingSignatures: documentMetrics.pending_signatures,
            expiringSoon: documentMetrics.expiring_soon
          },
          communications: {
            totalMessages: communicationMetrics.total_messages,
            unreadMessages: communicationMetrics.unread_messages,
            recentMessages: communicationMetrics.recent_messages
          },
          notifications: {
            total: notificationMetrics.total_notifications,
            unread: notificationMetrics.unread_notifications,
            urgent: notificationMetrics.urgent_notifications
          }
        },
        recentActivity: {
          caseUpdates: recentCaseUpdates,
          documents: recentDocuments,
          messages: recentMessages
        },
        upcomingItems: {
          deadlines: upcomingDeadlines,
          payments: upcomingPayments.map(payment => ({
            ...payment,
            amount: Number(payment.amount)
          }))
        },
        alerts
      },
      fetchedAt: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Error fetching dashboard data', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}