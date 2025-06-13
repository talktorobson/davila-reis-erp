// D'Avila Reis ERP - Portal Invoices API
// Financial management with invoices, payments, and overdue tracking

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { financialRecords, cases } from '@/lib/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
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
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Build filters
    const conditions = [
      eq(financialRecords.client_id, session.user.client_id),
      eq(financialRecords.type, 'Invoice')
    ]

    if (status) {
      conditions.push(eq(financialRecords.status, status as any))
    }

    // Execute main query
    const invoices = await db
      .select({
        id: financialRecords.id,
        description: financialRecords.description,
        amount: financialRecords.amount,
        due_date: financialRecords.due_date,
        payment_date: financialRecords.payment_date,
        status: financialRecords.status,
        category: financialRecords.category,
        payment_method: financialRecords.payment_method,
        invoice_number: financialRecords.invoice_number,
        tax_rate: financialRecords.tax_rate,
        tax_amount: financialRecords.tax_amount,
        total_with_tax: financialRecords.total_with_tax,
        days_overdue: financialRecords.days_overdue,
        aging_bucket: financialRecords.aging_bucket,
        payment_link: financialRecords.payment_link,
        receipt: financialRecords.receipt,
        notes: financialRecords.notes,
        created_at: financialRecords.created_at,
        updated_at: financialRecords.updated_at,
        // Case information
        case_id: financialRecords.case_id,
        case_number: cases.case_number,
        case_title: cases.case_title
      })
      .from(financialRecords)
      .leftJoin(cases, eq(financialRecords.case_id, cases.id))
      .where(and(...conditions))
      .orderBy(desc(financialRecords.created_at))
      .limit(limit)
      .offset(offset)

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(financialRecords)
      .where(and(...conditions))

    const total = totalResult.count

    // Calculate financial summary
    const [summary] = await db
      .select({
        total_invoices: count(),
        total_amount: sql<number>`COALESCE(SUM(${financialRecords.amount}), 0)::numeric`,
        total_with_tax: sql<number>`COALESCE(SUM(${financialRecords.total_with_tax}), 0)::numeric`,
        pending_amount: sql<number>`COALESCE(SUM(CASE WHEN ${financialRecords.status} = 'Pending' THEN ${financialRecords.total_with_tax} ELSE 0 END), 0)::numeric`,
        paid_amount: sql<number>`COALESCE(SUM(CASE WHEN ${financialRecords.status} = 'Paid' THEN ${financialRecords.total_with_tax} ELSE 0 END), 0)::numeric`,
        overdue_amount: sql<number>`COALESCE(SUM(CASE WHEN ${financialRecords.status} = 'Overdue' THEN ${financialRecords.total_with_tax} ELSE 0 END), 0)::numeric`,
        partial_amount: sql<number>`COALESCE(SUM(CASE WHEN ${financialRecords.status} = 'Partial' THEN ${financialRecords.total_with_tax} ELSE 0 END), 0)::numeric`,
        pending_count: sql<number>`COUNT(CASE WHEN ${financialRecords.status} = 'Pending' THEN 1 END)::int`,
        paid_count: sql<number>`COUNT(CASE WHEN ${financialRecords.status} = 'Paid' THEN 1 END)::int`,
        overdue_count: sql<number>`COUNT(CASE WHEN ${financialRecords.status} = 'Overdue' THEN 1 END)::int`,
        partial_count: sql<number>`COUNT(CASE WHEN ${financialRecords.status} = 'Partial' THEN 1 END)::int`
      })
      .from(financialRecords)
      .where(and(
        eq(financialRecords.client_id, session.user.client_id),
        eq(financialRecords.type, 'Invoice')
      ))

    // Get aging analysis
    const agingAnalysis = await db
      .select({
        aging_bucket: financialRecords.aging_bucket,
        count: count(),
        total_amount: sql<number>`COALESCE(SUM(${financialRecords.total_with_tax}), 0)::numeric`
      })
      .from(financialRecords)
      .where(and(
        eq(financialRecords.client_id, session.user.client_id),
        eq(financialRecords.type, 'Invoice'),
        eq(financialRecords.status, 'Overdue')
      ))
      .groupBy(financialRecords.aging_bucket)
      .orderBy(financialRecords.aging_bucket)

    // Get recent payment history
    const recentPayments = await db
      .select({
        id: financialRecords.id,
        invoice_number: financialRecords.invoice_number,
        description: financialRecords.description,
        amount: financialRecords.total_with_tax,
        payment_date: financialRecords.payment_date,
        payment_method: financialRecords.payment_method,
        case_number: cases.case_number
      })
      .from(financialRecords)
      .leftJoin(cases, eq(financialRecords.case_id, cases.id))
      .where(and(
        eq(financialRecords.client_id, session.user.client_id),
        eq(financialRecords.type, 'Invoice'),
        eq(financialRecords.status, 'Paid')
      ))
      .orderBy(desc(financialRecords.payment_date))
      .limit(10)

    logger.info('Portal invoices fetched successfully', {
      clientId: session.user.client_id,
      userId: session.user.id,
      resultCount: invoices.length,
      filters: { status }
    })

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        summary: {
          totalInvoices: Number(summary.total_invoices),
          totalAmount: Number(summary.total_amount),
          totalWithTax: Number(summary.total_with_tax),
          pendingAmount: Number(summary.pending_amount),
          paidAmount: Number(summary.paid_amount),
          overdueAmount: Number(summary.overdue_amount),
          partialAmount: Number(summary.partial_amount),
          pendingCount: summary.pending_count,
          paidCount: summary.paid_count,
          overdueCount: summary.overdue_count,
          partialCount: summary.partial_count,
          paymentRate: summary.total_invoices > 0 
            ? Math.round((summary.paid_count / Number(summary.total_invoices)) * 100) 
            : 0
        },
        agingAnalysis: agingAnalysis.map(item => ({
          agingBucket: item.aging_bucket,
          count: Number(item.count),
          totalAmount: Number(item.total_amount)
        })),
        recentPayments: recentPayments.map(payment => ({
          ...payment,
          amount: Number(payment.amount)
        }))
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
    logger.error('Error fetching portal invoices', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}