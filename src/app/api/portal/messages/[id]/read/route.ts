// D'Avila Reis ERP - Portal Message Read API
// Mark messages as read for proper notification management

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { clientCommunications } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params
  const session = await getServerSession(authOptionsPortal)
  
  try {
    
    if (!session?.user?.client_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }


    // Verify message belongs to client and mark as read
    const [updatedMessage] = await db
      .update(clientCommunications)
      .set({
        read_by_recipient: true,
        read_at: new Date()
      })
      .where(and(
        eq(clientCommunications.id, messageId),
        eq(clientCommunications.client_id, session.user.client_id),
        eq(clientCommunications.recipient_type, 'client')
      ))
      .returning({
        id: clientCommunications.id,
        read_by_recipient: clientCommunications.read_by_recipient,
        read_at: clientCommunications.read_at
      })

    if (!updatedMessage) {
      return NextResponse.json(
        { success: false, error: 'Mensagem não encontrada' },
        { status: 404 }
      )
    }

    logger.info('Message marked as read', {
      messageId,
      clientId: session.user.client_id,
      userId: session.user.id
    })

    return NextResponse.json({
      success: true,
      data: updatedMessage,
      message: 'Mensagem marcada como lida'
    })
    
  } catch (error) {
    logger.error('Error marking message as read', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}