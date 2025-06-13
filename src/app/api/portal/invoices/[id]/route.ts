// D'Avila Reis ERP - Portal Single Invoice API
// Detailed invoice information with payment processing integration

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { financialRecords, cases, clients } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: invoiceId } = await params
  const session = await getServerSession(authOptionsPortal)
  
  try {
    
    if (!session?.user?.client_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }


    // Fetch invoice details with verification
    const [invoiceDetails] = await db
      .select({
        // Invoice information
        id: financialRecords.id,
        description: financialRecords.description,
        amount: financialRecords.amount,
        dueDate: financialRecords.due_date,
        paymentDate: financialRecords.payment_date,
        status: financialRecords.status,
        category: financialRecords.category,
        paymentMethod: financialRecords.payment_method,
        invoiceNumber: financialRecords.invoice_number,
        taxRate: financialRecords.tax_rate,
        taxAmount: financialRecords.tax_amount,
        totalWithTax: financialRecords.total_with_tax,
        daysOverdue: financialRecords.days_overdue,
        agingBucket: financialRecords.aging_bucket,
        paymentLink: financialRecords.payment_link,
        receipt: financialRecords.receipt,
        notes: financialRecords.notes,
        createdAt: financialRecords.created_at,
        updatedAt: financialRecords.updated_at,
        // Case information
        caseId: financialRecords.case_id,
        caseNumber: cases.case_number,
        caseTitle: cases.case_title,
        caseStatus: cases.status,
        assignedLawyer: cases.assigned_lawyer,
        // Client information
        companyName: clients.company_name,
        contactPerson: clients.contact_person,
        email: clients.email,
        phone: clients.phone,
        address: clients.address,
        cnpj: clients.cnpj
      })
      .from(financialRecords)
      .leftJoin(cases, eq(financialRecords.case_id, cases.id))
      .innerJoin(clients, eq(financialRecords.client_id, clients.id))
      .where(and(
        eq(financialRecords.id, invoiceId),
        eq(financialRecords.client_id, session.user.client_id),
        eq(financialRecords.type, 'Invoice')
      ))

    if (!invoiceDetails) {
      logger.warn('Unauthorized invoice access attempt', {
        invoiceId,
        userId: session.user.id,
        clientId: session.user.client_id
      })

      return NextResponse.json(
        { success: false, error: 'Fatura não encontrada' },
        { status: 404 }
      )
    }

    // Calculate payment status and timing
    const now = new Date()
    const dueDate = invoiceDetails.dueDate ? new Date(invoiceDetails.dueDate) : null
    const isOverdue = dueDate && now > dueDate && invoiceDetails.status !== 'Paid'
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

    // Generate payment methods if invoice is unpaid
    const availablePaymentMethods = invoiceDetails.status === 'Pending' || invoiceDetails.status === 'Partial' 
      ? [
          { method: 'pix', name: 'PIX', available: true },
          { method: 'boleto', name: 'Boleto Bancário', available: true },
          { method: 'credit_card', name: 'Cartão de Crédito', available: !!invoiceDetails.paymentLink },
          { method: 'bank_transfer', name: 'Transferência Bancária', available: true }
        ]
      : []

    logger.info('Invoice details fetched successfully', {
      invoiceId,
      clientId: session.user.client_id,
      userId: session.user.id,
      invoiceNumber: invoiceDetails.invoiceNumber,
      amount: invoiceDetails.totalWithTax,
      status: invoiceDetails.status
    })

    return NextResponse.json({
      success: true,
      data: {
        invoice: {
          ...invoiceDetails,
          amount: Number(invoiceDetails.amount),
          taxAmount: Number(invoiceDetails.taxAmount || 0),
          totalWithTax: Number(invoiceDetails.totalWithTax || invoiceDetails.amount),
          isOverdue,
          daysUntilDue,
          canPay: invoiceDetails.status === 'Pending' || invoiceDetails.status === 'Partial'
        },
        paymentMethods: availablePaymentMethods,
        meta: {
          fetchedAt: new Date().toISOString(),
          currency: 'BRL'
        }
      }
    })
    
  } catch (error) {
    logger.error('Error fetching invoice details', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}