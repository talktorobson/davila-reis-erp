// D'Avila Reis ERP - Document Download API
// Secure document download with access control and audit logging

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { documents, cases, documentAccessLogs } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await getServerSession(authOptionsPortal)
  const { documentId } = await params
  
  try {
    if (!session?.user?.client_id || !session?.user?.portal_user_id) {
      logger.warn('Unauthorized document download attempt', {
        documentId,
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    // Verify document exists and client has access
    const [document] = await db
      .select({
        id: documents.id,
        document_name: documents.document_name,
        file_url: documents.file_url,
        file_size: documents.file_size,
        access_level: documents.access_level,
        status: documents.status,
        case_id: documents.case_id
      })
      .from(documents)
      .innerJoin(cases, eq(documents.case_id, cases.id))
      .where(and(
        eq(documents.id, documentId),
        eq(cases.client_id, session.user.client_id),
        // Only allow access to client-visible documents
        eq(documents.access_level, 'Client Only')
      ))

    if (!document) {
      logger.warn('Document not found or access denied', {
        documentId,
        clientId: session.user.client_id,
        userId: session.user.id
      })
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Log the download for LGPD compliance and audit
    await db.insert(documentAccessLogs).values({
      document_id: document.id,
      client_id: session.user.client_id,
      user_id: session.user.portal_user_id,
      action: 'download',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      success: true
    })

    // TODO: In production, stream file from GCP Cloud Storage
    // For now, return a mock file response
    const mockFileContent = `Mock PDF Content for ${document.document_name}
    
This is a placeholder for the actual document content that would be served from GCP Cloud Storage.

Document ID: ${document.id}
File Name: ${document.document_name}
Case ID: ${document.case_id}
Access Level: ${document.access_level}
Status: ${document.status}

In production, this would be the actual file content streamed from Cloud Storage.`

    logger.info('Document downloaded successfully', {
      documentId: document.id,
      documentName: document.document_name,
      clientId: session.user.client_id,
      userId: session.user.id,
      fileSize: document.file_size
    })

    // Return file with proper headers
    return new NextResponse(mockFileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.document_name}"`,
        'Content-Length': document.file_size?.toString() || '0',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    logger.error('Error downloading document', error as Error, {
      documentId,
      clientId: session?.user?.client_id,
      userId: session?.user?.id
    })

    // Log failed attempt
    if (session?.user?.client_id && session?.user?.portal_user_id) {
      await db.insert(documentAccessLogs).values({
        document_id: documentId,
        client_id: session.user.client_id,
        user_id: session.user.portal_user_id,
        action: 'download',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        success: false,
        error_message: (error as Error).message
      })
    }

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}