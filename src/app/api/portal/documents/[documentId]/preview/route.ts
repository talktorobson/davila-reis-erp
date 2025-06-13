// D'Avila Reis ERP - Document Preview API
// Secure document preview with access control and audit logging

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
      logger.warn('Unauthorized document preview attempt', {
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
        document_type: documents.document_type,
        file_url: documents.file_url,
        file_size: documents.file_size,
        access_level: documents.access_level,
        status: documents.status,
        case_id: documents.case_id,
        created_at: documents.created_at,
        last_modified: documents.last_modified
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
      logger.warn('Document not found or access denied for preview', {
        documentId: documentId,
        clientId: session.user.client_id,
        userId: session.user.id
      })
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Log the preview for LGPD compliance and audit
    await db.insert(documentAccessLogs).values({
      document_id: document.id,
      client_id: session.user.client_id,
      user_id: session.user.portal_user_id,
      action: 'view',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      success: true
    })

    // TODO: In production, stream file from GCP Cloud Storage for preview
    // For now, return a mock file response suitable for browser viewing
    const mockFileContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Resources << /Font << /F1 4 0 R >> >>
   /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 100 >>
stream
BT
/F1 12 Tf
100 700 Td
(Preview: ${document.document_name}) Tj
100 680 Td
(Document ID: ${document.id}) Tj
100 660 Td
(Type: ${document.document_type}) Tj
100 640 Td
(Status: ${document.status}) Tj
100 620 Td
(This is a mock preview for development.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000271 00000 n 
0000000340 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
540
%%EOF`

    logger.info('Document previewed successfully', {
      documentId: document.id,
      documentName: document.document_name,
      clientId: session.user.client_id,
      userId: session.user.id,
      fileSize: document.file_size
    })

    // Return file with proper headers for inline viewing
    return new NextResponse(mockFileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${document.document_name}"`,
        'Content-Length': mockFileContent.length.toString(),
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        'X-Frame-Options': 'SAMEORIGIN', // Security: only allow framing by same origin
        'X-Content-Type-Options': 'nosniff'
      }
    })
    
  } catch (error) {
    logger.error('Error previewing document', error as Error, {
      documentId: documentId,
      clientId: session?.user?.client_id,
      userId: session?.user?.id
    })

    // Log failed attempt
    if (session?.user?.client_id && session?.user?.portal_user_id) {
      await db.insert(documentAccessLogs).values({
        document_id: documentId,
        client_id: session.user.client_id,
        user_id: session.user.portal_user_id,
        action: 'view',
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