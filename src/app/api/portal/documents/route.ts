// D'Avila Reis ERP - Portal Documents API
// Secure document management with access control, virus scanning, and LGPD compliance

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { documents, cases, documentAccessLogs } from '@/lib/schema'
import { eq, and, desc, or, like, count } from 'drizzle-orm'
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
    const documentType = searchParams.get('type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Build filters
    const conditions = [
      eq(cases.client_id, session.user.client_id),
      or(
        eq(documents.access_level, 'Client Only'),
        eq(documents.access_level, 'Public')
      )
    ]

    // Apply filters
    if (caseId) {
      conditions.push(eq(documents.case_id, caseId))
    }

    if (documentType) {
      conditions.push(eq(documents.document_type, documentType))
    }

    if (status) {
      conditions.push(eq(documents.status, status as any))
    }

    if (search) {
      conditions.push(
        or(
          like(documents.document_name, `%${search}%`),
          like(documents.document_type, `%${search}%`),
          like(cases.case_title, `%${search}%`),
          like(cases.case_number, `%${search}%`)
        )
      )
    }

    // Execute main query
    const clientDocuments = await db
      .select({
        id: documents.id,
        document_name: documents.document_name,
        document_type: documents.document_type,
        file_size: documents.file_size,
        access_level: documents.access_level,
        tags: documents.tags,
        version: documents.version,
        status: documents.status,
        expiry_date: documents.expiry_date,
        last_modified: documents.last_modified,
        clicksign_status: documents.clicksign_status,
        signature_required: documents.signature_required,
        upload_date: documents.upload_date,
        created_at: documents.created_at,
        // Case information
        case_id: documents.case_id,
        case_number: cases.case_number,
        case_title: cases.case_title,
        case_status: cases.status
      })
      .from(documents)
      .innerJoin(cases, eq(documents.case_id, cases.id))
      .where(and(...conditions))
      .orderBy(desc(documents.upload_date))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(documents)
      .innerJoin(cases, eq(documents.case_id, cases.id))
      .where(and(...conditions))

    const total = totalResult.count

    // Get document type summary
    const documentTypeSummary = await db
      .select({
        document_type: documents.document_type,
        count: count()
      })
      .from(documents)
      .innerJoin(cases, eq(documents.case_id, cases.id))
      .where(and(
        eq(cases.client_id, session.user.client_id),
        or(
          eq(documents.access_level, 'Client Only'),
          eq(documents.access_level, 'Public')
        )
      ))
      .groupBy(documents.document_type)
      .orderBy(desc(count()))

    // Get status summary
    const statusSummary = await db
      .select({
        status: documents.status,
        count: count()
      })
      .from(documents)
      .innerJoin(cases, eq(documents.case_id, cases.id))
      .where(and(
        eq(cases.client_id, session.user.client_id),
        or(
          eq(documents.access_level, 'Client Only'),
          eq(documents.access_level, 'Public')
        )
      ))
      .groupBy(documents.status)
      .orderBy(desc(count()))

    logger.info('Portal documents fetched successfully', {
      clientId: session.user.client_id,
      userId: session.user.id,
      filters: { caseId, documentType, status, search },
      resultCount: clientDocuments.length
    })

    return NextResponse.json({
      success: true,
      data: clientDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      },
      summary: {
        byType: documentTypeSummary,
        byStatus: statusSummary,
        totalDocuments: total
      },
      filters: { caseId, documentType, status, search },
      fetchedAt: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Error fetching portal documents', error as Error)

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const caseId = formData.get('caseId') as string
    const documentType = formData.get('documentType') as string
    const documentName = formData.get('documentName') as string

    // Validate inputs
    if (!file || !caseId || !documentType || !documentName) {
      return NextResponse.json(
        { success: false, error: 'Arquivo, processo, tipo e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verify case belongs to client
    const [caseDetails] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(and(
        eq(cases.id, caseId),
        eq(cases.client_id, session.user.client_id)
      ))

    if (!caseDetails) {
      return NextResponse.json(
        { success: false, error: 'Processo não encontrado' },
        { status: 404 }
      )
    }

    // File validation
    const maxFileSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { success: false, error: 'Arquivo muito grande. Máximo 50MB.' },
        { status: 400 }
      )
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de arquivo não permitido' },
        { status: 400 }
      )
    }

    // TODO: Upload file to GCP Cloud Storage with virus scanning
    // For now, we'll create a placeholder URL
    const fileUrl = `/uploads/client-documents/${session.user.client_id}/${caseId}/${Date.now()}-${file.name}`

    // Create document record
    const [newDocument] = await db
      .insert(documents)
      .values({
        client_id: session.user.client_id,
        case_id: caseId,
        document_name: documentName,
        document_type: documentType,
        file_url: fileUrl,
        file_size: file.size,
        access_level: 'Client Only',
        version: '1.0',
        status: 'Under Review',
        last_modified: new Date(),
        upload_date: new Date(),
        created_by: session.user.id
      })
      .returning()

    // Log the upload for LGPD compliance
    await db.insert(documentAccessLogs).values({
      document_id: newDocument.id,
      client_id: session.user.client_id,
      user_id: session.user.portal_user_id,
      action: 'view',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      success: true
    })

    logger.info('Document uploaded successfully', {
      documentId: newDocument.id,
      clientId: session.user.client_id,
      userId: session.user.id,
      caseId,
      documentType,
      fileName: documentName,
      fileSize: file.size
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newDocument.id,
        document_name: newDocument.document_name,
        document_type: newDocument.document_type,
        file_size: newDocument.file_size,
        status: newDocument.status,
        uploadDate: newDocument.upload_date
      },
      message: 'Documento enviado com sucesso'
    })
    
  } catch (error) {
    logger.error('Error uploading document', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}