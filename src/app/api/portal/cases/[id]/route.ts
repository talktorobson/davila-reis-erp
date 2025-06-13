// D'Avila Reis ERP - Portal Single Case API
// Detailed case information with timeline, documents, tasks, and communications

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { 
  cases, 
  clients, 
  tasks, 
  documents, 
  financialRecords, 
  clientCommunications 
} from '@/lib/schema'
import { eq, and, desc, or } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params
  
  try {
    const session = await getServerSession(authOptionsPortal)
    
    if (!session?.user?.client_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    // Fetch case details with client verification
    const [caseDetails] = await db
      .select({
        id: cases.id,
        case_number: cases.case_number,
        client_id: cases.client_id,
        case_title: cases.case_title,
        service_type: cases.service_type,
        description: cases.description,
        status: cases.status,
        priority: cases.priority,
        assigned_lawyer: cases.assigned_lawyer,
        supporting_staff: cases.supporting_staff,
        start_date: cases.start_date,
        due_date: cases.due_date,
        expected_close_date: cases.expected_close_date,
        actual_close_date: cases.actual_close_date,
        hours_budgeted: cases.hours_budgeted,
        hours_worked: cases.hours_worked,
        hourly_rate: cases.hourly_rate,
        fixed_fee: cases.fixed_fee,
        total_value: cases.total_value,
        progress_percentage: cases.progress_percentage,
        court_agency: cases.court_agency,
        case_number_external: cases.case_number_external,
        opposing_party: cases.opposing_party,
        risk_level: cases.risk_level,
        key_dates: cases.key_dates,
        next_steps: cases.next_steps,
        outcome: cases.outcome,
        client_satisfaction: cases.client_satisfaction,
        notes: cases.notes,
        created_at: cases.created_at,
        updated_at: cases.updated_at,
        // Client info
        company_name: clients.company_name,
        contact_person: clients.contact_person,
        email: clients.email,
        phone: clients.phone
      })
      .from(cases)
      .innerJoin(clients, eq(cases.client_id, clients.id))
      .where(and(
        eq(cases.id, caseId),
        eq(cases.client_id, session.user.client_id)
      ))

    if (!caseDetails) {
      logger.warn('Unauthorized case access attempt', {
        userId: session.user.id,
        clientId: session.user.client_id,
        requestedCaseId: caseId
      })
      return NextResponse.json(
        { success: false, error: 'Processo não encontrado' },
        { status: 404 }
      )
    }

    // Fetch related tasks
    const caseTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        assignedTo: tasks.assigned_to,
        dueDate: tasks.due_date,
        priority: tasks.priority,
        status: tasks.status,
        taskType: tasks.task_type,
        timeEstimate: tasks.time_estimate,
        timeSpent: tasks.time_spent,
        progressPercentage: tasks.progress_percentage,
        deadlineCritical: tasks.deadline_critical,
        billable: tasks.billable,
        completedDate: tasks.completed_date,
        nextAction: tasks.next_action,
        createdAt: tasks.created_at,
        updatedAt: tasks.updated_at
      })
      .from(tasks)
      .where(eq(tasks.case_id, caseId))
      .orderBy(desc(tasks.created_at))

    // Fetch case documents (only client-accessible)
    const caseDocuments = await db
      .select({
        id: documents.id,
        documentName: documents.document_name,
        documentType: documents.document_type,
        fileSize: documents.file_size,
        accessLevel: documents.access_level,
        tags: documents.tags,
        version: documents.version,
        status: documents.status,
        expiryDate: documents.expiry_date,
        lastModified: documents.last_modified,
        clickSignStatus: documents.clicksign_status,
        signatureRequired: documents.signature_required,
        uploadDate: documents.upload_date,
        createdAt: documents.created_at
      })
      .from(documents)
      .where(and(
        eq(documents.case_id, caseId),
        // Only show documents client can access
        or(
          eq(documents.access_level, 'Client Only'),
          eq(documents.access_level, 'Public')
        )
      ))
      .orderBy(desc(documents.upload_date))

    // Fetch recent communications for this case
    const recentCommunications = await db
      .select({
        id: clientCommunications.id,
        senderType: clientCommunications.sender_type,
        subject: clientCommunications.subject,
        message: clientCommunications.message,
        readByRecipient: clientCommunications.read_by_recipient,
        priority: clientCommunications.priority,
        messageType: clientCommunications.message_type,
        createdAt: clientCommunications.created_at
      })
      .from(clientCommunications)
      .where(and(
        eq(clientCommunications.case_id, caseId),
        eq(clientCommunications.client_id, session.user.client_id)
      ))
      .orderBy(desc(clientCommunications.created_at))
      .limit(10)

    // Fetch financial records for this case
    const caseFinancials = await db
      .select({
        id: financialRecords.id,
        type: financialRecords.type,
        description: financialRecords.description,
        amount: financialRecords.amount,
        dueDate: financialRecords.due_date,
        paymentDate: financialRecords.payment_date,
        status: financialRecords.status,
        category: financialRecords.category,
        invoiceNumber: financialRecords.invoice_number,
        totalWithTax: financialRecords.total_with_tax,
        daysOverdue: financialRecords.days_overdue,
        paymentLink: financialRecords.payment_link,
        createdAt: financialRecords.created_at
      })
      .from(financialRecords)
      .where(eq(financialRecords.case_id, caseId))
      .orderBy(desc(financialRecords.created_at))

    // Calculate case metrics
    const totalTasks = caseTasks.length
    const completedTasks = caseTasks.filter(task => task.status === 'Done').length
    const overdueTasks = caseTasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < new Date() && 
      task.status !== 'Done' && 
      task.status !== 'Cancelled'
    ).length
    
    const totalInvoiced = caseFinancials
      .filter(record => record.type === 'Invoice')
      .reduce((sum, record) => sum + Number(record.amount || 0), 0)
    
    const totalPaid = caseFinancials
      .filter(record => record.type === 'Invoice' && record.status === 'Paid')
      .reduce((sum, record) => sum + Number(record.amount || 0), 0)

    const unreadMessages = recentCommunications.filter(comm => 
      comm.senderType !== 'client' && !comm.readByRecipient
    ).length

    logger.info('Case details fetched successfully', {
      caseId,
      clientId: session.user.client_id,
      userId: session.user.id,
      totalTasks,
      totalDocuments: caseDocuments.length
    })

    return NextResponse.json({
      success: true,
      data: {
        case: caseDetails,
        tasks: caseTasks,
        documents: caseDocuments,
        communications: recentCommunications,
        financials: caseFinancials,
        metrics: {
          totalTasks,
          completedTasks,
          overdueTasks,
          taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          totalInvoiced,
          totalPaid,
          outstandingAmount: totalInvoiced - totalPaid,
          unreadMessages,
          documentCount: caseDocuments.length,
          daysActive: Math.ceil(
            (new Date().getTime() - new Date(caseDetails.start_date).getTime()) / (1000 * 60 * 60 * 24)
          )
        }
      },
      fetchedAt: new Date().toISOString()
    })
    
  } catch (err) {
    logger.error('Error fetching case details', err as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}