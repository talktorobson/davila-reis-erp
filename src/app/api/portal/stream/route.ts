// D'Avila Reis ERP - Portal Real-time Stream API
// Server-Sent Events for real-time updates on cases, messages, and notifications

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { 
  clientCommunications, 
  clientNotifications, 
  cases, 
  documents, 
  financialRecords 
} from '@/lib/schema'
import { eq, and, gt, desc } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Stream management
const activeStreams = new Map<string, { controller: ReadableStreamDefaultController; lastCheck: Date }>()

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptionsPortal)
  
  if (!session?.user?.client_id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const clientId = session.user.client_id
  const userId = session.user.id

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const streamId = `${clientId}-${Date.now()}`
      const lastCheck = new Date()

      // Store stream for cleanup
      activeStreams.set(streamId, { controller, lastCheck })

      // Send initial connection event
      const initialEvent = {
        type: 'connected',
        data: {
          clientId,
          timestamp: new Date().toISOString(),
          streamId
        }
      }

      controller.enqueue(`data: ${JSON.stringify(initialEvent)}\n\n`)

      logger.info('SSE stream connected', { clientId, userId, streamId })

      // Set up polling for updates
      const checkForUpdates = async () => {
        try {
          const streamData = activeStreams.get(streamId)
          if (!streamData) return // Stream was closed

          const lastCheckTime = streamData.lastCheck
          const now = new Date()

          // Check for new messages
          const newMessages = await db
            .select({
              id: clientCommunications.id,
              subject: clientCommunications.subject,
              message: clientCommunications.message,
              sender_type: clientCommunications.sender_type,
              priority: clientCommunications.priority,
              message_type: clientCommunications.message_type,
              case_id: clientCommunications.case_id,
              created_at: clientCommunications.created_at
            })
            .from(clientCommunications)
            .where(and(
              eq(clientCommunications.client_id, clientId),
              eq(clientCommunications.recipient_type, 'client'),
              gt(clientCommunications.created_at, lastCheckTime)
            ))
            .orderBy(desc(clientCommunications.created_at))

          if (newMessages.length > 0) {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'new_messages',
              data: newMessages,
              timestamp: now.toISOString()
            })}\n\n`)
          }

          // Check for new notifications
          const newNotifications = await db
            .select({
              id: clientNotifications.id,
              title: clientNotifications.title,
              message: clientNotifications.message,
              type: clientNotifications.type,
              action_url: clientNotifications.action_url,
              metadata: clientNotifications.metadata,
              created_at: clientNotifications.created_at
            })
            .from(clientNotifications)
            .where(and(
              eq(clientNotifications.client_id, clientId),
              gt(clientNotifications.created_at, lastCheckTime),
              eq(clientNotifications.read, false)
            ))
            .orderBy(desc(clientNotifications.created_at))

          if (newNotifications.length > 0) {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'new_notifications',
              data: newNotifications,
              timestamp: now.toISOString()
            })}\n\n`)
          }

          // Check for case updates
          const updatedCases = await db
            .select({
              id: cases.id,
              case_number: cases.case_number,
              case_title: cases.case_title,
              status: cases.status,
              progress_percentage: cases.progress_percentage,
              next_steps: cases.next_steps,
              updated_at: cases.updated_at
            })
            .from(cases)
            .where(and(
              eq(cases.client_id, clientId),
              gt(cases.updated_at, lastCheckTime)
            ))
            .orderBy(desc(cases.updated_at))

          if (updatedCases.length > 0) {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'case_updates',
              data: updatedCases,
              timestamp: now.toISOString()
            })}\n\n`)
          }

          // Check for new documents
          const newDocuments = await db
            .select({
              id: documents.id,
              document_name: documents.document_name,
              document_type: documents.document_type,
              case_id: documents.case_id,
              status: documents.status,
              upload_date: documents.upload_date
            })
            .from(documents)
            .where(and(
              eq(documents.client_id, clientId),
              gt(documents.upload_date, lastCheckTime)
            ))
            .orderBy(desc(documents.upload_date))

          if (newDocuments.length > 0) {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'new_documents',
              data: newDocuments,
              timestamp: now.toISOString()
            })}\n\n`)
          }

          // Check for financial updates
          const financialUpdates = await db
            .select({
              id: financialRecords.id,
              type: financialRecords.type,
              description: financialRecords.description,
              amount: financialRecords.amount,
              status: financialRecords.status,
              due_date: financialRecords.due_date,
              payment_date: financialRecords.payment_date,
              updated_at: financialRecords.updated_at
            })
            .from(financialRecords)
            .where(and(
              eq(financialRecords.client_id, clientId),
              gt(financialRecords.updated_at, lastCheckTime)
            ))
            .orderBy(desc(financialRecords.updated_at))

          if (financialUpdates.length > 0) {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'financial_updates',
              data: financialUpdates,
              timestamp: now.toISOString()
            })}\n\n`)
          }

          // Update last check time
          streamData.lastCheck = now

          // Send heartbeat every 30 seconds if no updates
          if (newMessages.length === 0 && newNotifications.length === 0 && 
              updatedCases.length === 0 && newDocuments.length === 0 && 
              financialUpdates.length === 0) {
            
            const timeSinceLastEvent = now.getTime() - lastCheckTime.getTime()
            if (timeSinceLastEvent > 30000) { // 30 seconds
              controller.enqueue(`data: ${JSON.stringify({
                type: 'heartbeat',
                data: { timestamp: now.toISOString() }
              })}\n\n`)
            }
          }

        } catch (error) {
          logger.error('SSE polling error', error as Error)

          controller.enqueue(`data: ${JSON.stringify({
            type: 'error',
            data: { message: 'Internal server error' },
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
      }

      // Poll every 5 seconds
      const interval = setInterval(checkForUpdates, 5000)

      // Cleanup function
      const cleanup = () => {
        clearInterval(interval)
        activeStreams.delete(streamId)
        
        logger.info('SSE stream disconnected', { clientId, userId, streamId })
      }

      // Handle connection close
      request.signal.addEventListener('abort', cleanup)

      // Cleanup after 1 hour max
      setTimeout(() => {
        if (activeStreams.has(streamId)) {
          controller.close()
          cleanup()
        }
      }, 60 * 60 * 1000) // 1 hour
    },

    cancel() {
      // Stream was cancelled by client
      logger.info('SSE stream cancelled by client', { clientId, userId })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Cleanup inactive streams
setInterval(() => {
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  for (const [streamId, streamData] of activeStreams.entries()) {
    if (streamData.lastCheck < fiveMinutesAgo) {
      streamData.controller.close()
      activeStreams.delete(streamId)
      logger.info('Cleaned up inactive SSE stream', { streamId })
    }
  }
}, 60 * 1000) // Check every minute