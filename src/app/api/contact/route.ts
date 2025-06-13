// D'Avila Reis ERP - Contact Form API Endpoint
// POST /api/contact - Handles general contact form submissions

import { NextRequest, NextResponse } from 'next/server'
import EmailService from '@/lib/email'
import type { ContactFormData, ApiResponse } from '@/types'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 5 // Lower limit for contact forms

  const current = rateLimitStore.get(ip)
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count++
  return true
}

interface ContactData {
  name?: unknown
  email?: unknown
  phone?: unknown
  message?: unknown
  [key: string]: unknown
}

function validateContactData(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const contactData = data as ContactData

  // Required fields
  if (!contactData.name || typeof contactData.name !== 'string' || contactData.name.trim().length < 2) {
    errors.push('Nome é obrigatório e deve ter pelo menos 2 caracteres')
  }

  if (!contactData.email || typeof contactData.email !== 'string') {
    errors.push('Email é obrigatório')
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contactData.email)) {
      errors.push('Email deve ter um formato válido')
    }
  }

  if (!contactData.phone || typeof contactData.phone !== 'string') {
    errors.push('Telefone é obrigatório')
  } else {
    // Brazilian phone validation (basic)
    const phoneRegex = /^(\+55\s?)?(\(?[1-9]{2}\)?\s?)?([9]?\d{4}[-\s]?\d{4})$/
    if (!phoneRegex.test(contactData.phone.replace(/\s/g, ''))) {
      errors.push('Telefone deve ter um formato válido brasileiro')
    }
  }

  if (!contactData.message || typeof contactData.message !== 'string' || contactData.message.trim().length < 10) {
    errors.push('Mensagem é obrigatória e deve ter pelo menos 10 caracteres')
  }

  // Optional but validated fields
  if (contactData.company && (typeof contactData.company !== 'string' || contactData.company.length > 255)) {
    errors.push('Nome da empresa deve ter no máximo 255 caracteres')
  }


  return { isValid: errors.length === 0, errors }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{id: string}>>> {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Muitas tentativas. Tente novamente em 15 minutos.' 
        },
        { status: 429 }
      )
    }

    // Parse request body
    let body: ContactFormData
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos no corpo da requisição' 
        },
        { status: 400 }
      )
    }

    // Validate input data
    const validation = validateContactData(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.errors.join('; ') 
        },
        { status: 400 }
      )
    }

    // Generate unique contact ID for tracking
    const contactId = `CONTACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Send notification email to staff (don't await to avoid blocking)
    sendStaffNotification(body, contactId).catch(err => 
      console.error('Staff notification failed:', err)
    )
    
    // Send confirmation email to user (don't await to avoid blocking)
    sendUserConfirmation(body, contactId).catch(err => 
      console.error('User confirmation failed:', err)
    )

    // Log the contact (in production, store in database)
    console.log(`Contact form submission: ${contactId}`, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      messageLength: body.message?.length || 0,
      timestamp: new Date().toISOString()
    })

    // Success response even if email delivery fails (don't block user)
    // Email delivery status is logged but not returned to avoid exposing internal state

    return NextResponse.json({
      success: true,
      data: { id: contactId },
      message: 'Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.'
    })

  } catch (error) {
    console.error('Error processing contact form:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor. Tente novamente ou entre em contato por telefone.' 
      },
      { status: 500 }
    )
  }
}

async function sendStaffNotification(contact: ContactFormData, contactId: string): Promise<boolean> {
  try {
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">📞 Nova Mensagem de Contato</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #aa8019; padding-bottom: 10px;">
            Informações do Contato
          </h2>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555; width: 120px;">ID:</td>
                <td style="padding: 10px; font-family: monospace; background: #f8f9fa;">${contactId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Nome:</td>
                <td style="padding: 10px;">${contact.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 10px;"><a href="mailto:${contact.email}" style="color: #aa8019;">${contact.email}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Telefone:</td>
                <td style="padding: 10px;"><a href="tel:${contact.phone}" style="color: #aa8019;">${contact.phone}</a></td>
              </tr>
              ${contact.company ? `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Empresa:</td>
                <td style="padding: 10px;">${contact.company}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #555;">Data/Hora:</td>
                <td style="padding: 10px;">${new Date().toLocaleString('pt-BR')}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">💬 Mensagem:</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #aa8019;">
              <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">
                ${contact.message}
              </p>
            </div>
          </div>

          <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
            <p style="margin: 0; color: #2c3e50;">
              <strong>⏰ Ação necessária:</strong> Responder em até 2 horas para melhor experiência do cliente
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${contact.email}?subject=Re: Sua mensagem para D'avila Reis Advogados" 
               style="background: #aa8019; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 5px;">
              📧 Responder por Email
            </a>
            <a href="tel:${contact.phone}" 
               style="background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 5px;">
              📞 Ligar Agora
            </a>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">D'avila Reis Advogados - Sistema de Contato</p>
        </div>
      </div>
    `

    return await EmailService.sendEmail({
      to: process.env.NOTIFICATION_EMAIL || 'financeiro@davilareisadvogados.com.br',
      subject: `📞 Nova Mensagem: ${contact.name} - ${contactId}`,
      content
    })
  } catch (error) {
    console.error('Error sending staff notification:', error)
    return false
  }
}

async function sendUserConfirmation(contact: ContactFormData, contactId: string): Promise<boolean> {
  try {
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">D'avila Reis Advogados</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Mensagem Recebida com Sucesso</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">Olá, ${contact.name}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Obrigado por entrar em contato com a <strong>D'avila Reis Advogados</strong>. 
            Recebemos sua mensagem e nossa equipe já foi notificada.
          </p>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #aa8019;">
            <h3 style="color: #2c3e50; margin-top: 0;">📋 Resumo da sua mensagem</h3>
            <p style="margin: 5px 0;"><strong>ID de referência:</strong> <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">${contactId}</code></p>
            <p style="margin: 5px 0;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p style="margin: 5px 0;"><strong>Seu email:</strong> ${contact.email}</p>
            <p style="margin: 5px 0;"><strong>Seu telefone:</strong> ${contact.phone}</p>
            ${contact.company ? `<p style="margin: 5px 0;"><strong>Empresa:</strong> ${contact.company}</p>` : ''}
          </div>

          <div style="background: linear-gradient(135deg, #aa8019, #d4a62a); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0;">⏰ Próximos Passos</h3>
            <p style="margin-bottom: 15px;">Nossa equipe entrará em contato em até <strong>24 horas</strong> para:</p>
            <ul style="text-align: left; margin: 0; padding-left: 20px;">
              <li>Responder sua mensagem detalhadamente</li>
              <li>Agendar uma conversa, se necessário</li>
              <li>Oferecer orientação inicial gratuita</li>
            </ul>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">🛡️ Sobre Nossa Especialidade</h3>
            <p style="color: #555; margin-bottom: 15px;">
              Há <strong>20 anos</strong> protegemos empresários contra processos que podem atingir o patrimônio pessoal.
              Nossa expertise inclui:
            </p>
            <ul style="color: #555; margin: 0;">
              <li>Direito Trabalhista Preventivo</li>
              <li>Defesa em Processos Trabalhistas</li>
              <li>Consultoria Empresarial</li>
              <li>Proteção Patrimonial</li>
            </ul>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">📞 Contato Urgente?</h3>
            <p style="color: #555; margin-bottom: 15px;">Se sua situação for urgente, entre em contato imediatamente:</p>
            
            <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">
              <a href="tel:+551533844013" style="color: #aa8019; text-decoration: none; padding: 10px 15px; border: 2px solid #aa8019; border-radius: 5px; font-weight: bold;">
                📞 (15) 3384-4013
              </a>
              <a href="https://wa.me/5515999999999" style="color: #25d366; text-decoration: none; padding: 10px 15px; border: 2px solid #25d366; border-radius: 5px; font-weight: bold;">
                💬 WhatsApp
              </a>
            </div>
          </div>

          <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #2c3e50; font-size: 14px;">
              <strong>🏆 Confiança de 200+ empresários</strong><br>
              2.500+ processos gerenciados com sucesso
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px;">
            <strong>D'avila Reis Advogados</strong><br>
            Av. Dr. Vinício Gagliardi, 675 - Centro, Cerquilho/SP
          </p>
          <p style="margin: 0; font-size: 12px; opacity: 0.8;">
            Este é um e-mail automático de confirmação. Nossa equipe responderá em breve.
          </p>
        </div>
      </div>
    `

    return await EmailService.sendEmail({
      to: contact.email,
      subject: `✅ Mensagem recebida - D'avila Reis Advogados [${contactId}]`,
      content
    })
  } catch (error) {
    console.error('Error sending user confirmation:', error)
    return false
  }
}