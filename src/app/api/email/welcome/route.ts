// D'Avila Reis ERP - Welcome Email API Endpoint
// POST /api/email/welcome - Sends welcome emails to new leads/clients

import { NextRequest, NextResponse } from 'next/server'
import EmailService from '@/lib/email'
import { LeadService } from '@/lib/services/lead-service'
import type { ApiResponse } from '@/types'

interface WelcomeEmailRequest {
  lead_id?: string
  client_id?: string
  type: 'lead' | 'client'
  email?: string
  name?: string
}

function validateWelcomeEmailData(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    errors.push('Dados inválidos')
    return { isValid: false, errors }
  }

  const emailData = data as Record<string, unknown>

  if (!emailData.type || !['lead', 'client'].includes(emailData.type as string)) {
    errors.push('Tipo deve ser "lead" ou "client"')
  }

  // Either ID or email+name required
  if (!emailData.lead_id && !emailData.client_id && (!emailData.email || !emailData.name)) {
    errors.push('lead_id, client_id ou email+name são obrigatórios')
  }

  if (emailData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailData.email as string)) {
      errors.push('Email deve ter um formato válido')
    }
  }

  return { isValid: errors.length === 0, errors }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{sent: boolean, emailId: string}>>> {
  try {
    // Basic authentication check (in production, use proper middleware)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: WelcomeEmailRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos no corpo da requisição' 
        },
        { status: 400 }
      )
    }

    // Validate input data
    const validation = validateWelcomeEmailData(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.errors.join('; ') 
        },
        { status: 400 }
      )
    }

    let emailSent = false
    let emailId = ''

    if (body.type === 'lead') {
      if (body.lead_id) {
        // Send welcome email using lead ID
        const lead = await LeadService.get_lead_by_id(body.lead_id)
        if (!lead) {
          return NextResponse.json(
            { success: false, error: 'Lead não encontrado' },
            { status: 404 }
          )
        }

        emailSent = await EmailService.sendLeadWelcomeEmail(lead)
        emailId = `LEAD_WELCOME_${lead.id}_${Date.now()}`
        
        if (emailSent) {
          // Update lead to track that welcome email was sent
          await LeadService.update_lead(body.lead_id, {
            notes: `${lead.notes || ''}\n\n[${new Date().toISOString()}] Email de boas-vindas enviado automaticamente`
          })
        }
      } else if (body.email && body.name) {
        // Send welcome email using direct email/name
        const mockLead = {
          id: `TEMP_${Date.now()}`,
          name: body.name,
          email: body.email,
          phone: '',
          company: null,
          source: 'Website' as const,
          status: 'Cold' as const,
          initial_message: null,
          created_date: new Date(),
          last_contact: null,
          next_follow_up: null,
          assigned_lawyer: 'Dr. D\'avila Reis',
          lead_score: 5,
          budget_range: null,
          industry: null,
          company_size: null,
          region: 'Região 1 (015 Cerquilho)' as const,
          service_interest: [],
          utm_campaign: null,
          notes: null,
          conversion_probability: null,
          converted_to_client_id: null,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'system'
        }

        emailSent = await EmailService.sendLeadWelcomeEmail(mockLead)
        emailId = `DIRECT_WELCOME_${Date.now()}`
      }
    } else if (body.type === 'client') {
      // Client welcome email logic would go here
      // For now, return not implemented
      return NextResponse.json(
        { success: false, error: 'Cliente welcome email não implementado ainda' },
        { status: 501 }
      )
    }

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: 'Falha ao enviar email de boas-vindas' },
        { status: 500 }
      )
    }

    // Log the email sending
    console.log(`Welcome email sent: ${emailId}`, {
      type: body.type,
      lead_id: body.lead_id,
      client_id: body.client_id,
      email: body.email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: { sent: true, emailId },
      message: 'Email de boas-vindas enviado com sucesso'
    })

  } catch (error) {
    console.error('Error sending welcome email:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}

// GET /api/email/welcome - Get welcome email templates and statistics
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Basic authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'templates') {
      // Return available welcome email templates
      const templates = {
        lead: {
          subject: '🛡️ Recebemos sua mensagem - D\'avila Reis Advogados',
          description: 'Email de boas-vindas para novos leads',
          variables: ['name', 'email', 'phone', 'company', 'source']
        },
        client: {
          subject: '🎉 Bem-vindo à D\'avila Reis Advogados',
          description: 'Email de boas-vindas para novos clientes',
          variables: ['contactPerson', 'companyName', 'primaryLawyer', 'servicesContracted']
        }
      }

      return NextResponse.json({
        success: true,
        data: templates,
        message: 'Templates de email de boas-vindas'
      })
    }

    if (action === 'stats') {
      // Return email statistics (mock data for now)
      const stats = {
        totalSent: 150,
        openRate: 78.5,
        clickRate: 12.3,
        lastSent: new Date().toISOString(),
        byType: {
          lead: 120,
          client: 30
        }
      }

      return NextResponse.json({
        success: true,
        data: stats,
        message: 'Estatísticas de emails de boas-vindas'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Ação não reconhecida. Use ?action=templates ou ?action=stats' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error getting welcome email data:', error)
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}