// D'Avila Reis ERP - Follow-up Email API Endpoint
// POST /api/email/follow-up - Sends automated follow-up emails

import { NextRequest, NextResponse } from 'next/server'
import EmailService from '@/lib/email'
import { LeadService } from '@/lib/services/lead-service'
import { db } from '@/lib/database'
import { leads } from '@/lib/schema'
import { eq, and, lte, isNull } from 'drizzle-orm'
import type { ApiResponse, Lead } from '@/types'

interface FollowUpEmailRequest {
  lead_id?: string
  type: 'immediate' | 'day1' | 'day3' | 'day7' | 'day14' | 'custom'
  delay?: number // minutes for immediate, days for others
  custom_message?: string
  custom_subject?: string
}

interface FollowUpTemplate {
  subject: string
  content: string
  delayDays: number
}

// Follow-up email templates
const followUpTemplates: Record<string, FollowUpTemplate> = {
  day1: {
    subject: '🔔 Lembrete: Sua solicitação para D\'avila Reis Advogados',
    delayDays: 1,
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">D'avila Reis Advogados</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Não queremos que você fique esperando</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">Olá, {{name}}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Ontem você entrou em contato conosco através do nosso site, e queremos ter certeza 
            de que sua solicitação não passou despercebida.
          </p>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #aa8019;">
            <h3 style="color: #2c3e50; margin-top: 0;">🎯 Nosso Compromisso</h3>
            <p style="color: #555; margin-bottom: 0;">
              Respondemos <strong>100% das solicitações</strong> em até 24 horas. Se você ainda não 
              recebeu nossa resposta, pode ser que:
            </p>
            <ul style="color: #555; margin: 10px 0;">
              <li>Seu email foi para a caixa de spam</li>
              <li>Houve um problema técnico</li>
              <li>Precisamos de informações adicionais</li>
            </ul>
          </div>

          <div style="background: linear-gradient(135deg, #aa8019, #d4a62a); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0;">📞 Fale Conosco Agora</h3>
            <p style="margin-bottom: 15px;">Para agilizar o atendimento, entre em contato diretamente:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
              <a href="tel:+551533844013" style="color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 10px 15px; border-radius: 5px; font-weight: bold;">
                📞 (15) 3384-4013
              </a>
              <a href="https://wa.me/5515999999999" style="color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 10px 15px; border-radius: 5px; font-weight: bold;">
                💬 WhatsApp
              </a>
            </div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">⚡ Por que a Urgência?</h3>
            <p style="color: #555;">
              Questões trabalhistas têm <strong>prazos fatais</strong>. Quanto mais cedo agirmos, 
              maiores são as chances de:
            </p>
            <ul style="color: #555; margin: 10px 0;">
              <li>Prevenir processos custosos</li>
              <li>Proteger seu patrimônio pessoal</li>
              <li>Resolver questões amigavelmente</li>
              <li>Economizar tempo e dinheiro</li>
            </ul>
          </div>

          <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #2c3e50; font-size: 14px;">
              <strong>🏆 Mais de 200 empresários confiam em nosso trabalho</strong><br>
              20 anos protegendo patrimônios e empresas em São Paulo
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            <strong>D'avila Reis Advogados</strong> - Estamos aqui para ajudar você
          </p>
        </div>
      </div>
    `
  },
  
  day3: {
    subject: '🚨 Situação Urgente? Estamos Prontos para Ajudar',
    delayDays: 3,
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d35400; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 Tempo é Crucial em Questões Trabalhistas</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">{{name}}, você precisa de ajuda urgente?</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Faz 3 dias que você entrou em contato conosco. Sabemos que questões jurídicas 
            podem ser estressantes e que <strong>cada dia pode fazer diferença</strong>.
          </p>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">⚠️ Sinais de Que Você Precisa Agir AGORA:</h3>
            <ul style="color: #856404; margin: 0;">
              <li>Recebeu uma notificação do Ministério do Trabalho</li>
              <li>Funcionário ameaçou entrar com processo</li>
              <li>Tem dúvidas sobre demissão ou rescisão</li>
              <li>Empresa sendo fiscalizada</li>
              <li>Processo trabalhista já foi aberto</li>
            </ul>
          </div>

          <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0;">📞 LIGUE AGORA - ATENDIMENTO PRIORITÁRIO</h3>
            <p style="margin-bottom: 15px; font-size: 18px;">Mencione o código: <strong>WEB-URGENTE</strong></p>
            <a href="tel:+551533844013" style="color: white; text-decoration: none; background: rgba(255,255,255,0.3); padding: 15px 30px; border-radius: 5px; font-weight: bold; font-size: 18px; display: inline-block;">
              📞 (15) 3384-4013
            </a>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">💰 Quanto Pode Custar NÃO Agir?</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="background: #fee; padding: 15px; border-radius: 5px; border-left: 4px solid #e74c3c;">
                <strong style="color: #c0392b;">Sem Proteção:</strong><br>
                <span style="color: #555;">R$ 50.000 - R$ 500.000+</span><br>
                <small style="color: #777;">Processos + multas + patrimônio</small>
              </div>
              <div style="background: #eef; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60;">
                <strong style="color: #27ae60;">Com Proteção:</strong><br>
                <span style="color: #555;">R$ 500 - R$ 5.000</span><br>
                <small style="color: #777;">Consultoria preventiva</small>
              </div>
            </div>
          </div>

          <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #2c3e50;">
              <strong>Já protegemos mais de 200 empresários</strong><br>
              <em>"Melhor prevenir hoje do que remediar amanhã"</em>
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            D'avila Reis Advogados - Não deixe para amanhã o que pode custar caro depois
          </p>
        </div>
      </div>
    `
  },

  day7: {
    subject: '📊 Relatório: O que Acontece com Empresas Desprotegidas',
    delayDays: 7,
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">📊 Dados que Todo Empresário Deveria Conhecer</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">{{name}}, estes números vão te surpreender...</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Analisamos centenas de casos nos últimos 12 meses e descobrimos padrões 
            preocupantes que todo empresário deveria conhecer.
          </p>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">📈 Estatísticas Reais (2024)</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div style="text-align: center; padding: 15px; background: #fee; border-radius: 8px;">
                <div style="font-size: 36px; font-weight: bold; color: #e74c3c;">67%</div>
                <div style="color: #555; font-size: 14px;">das empresas sem proteção sofreram processos</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #efe; border-radius: 8px;">
                <div style="font-size: 36px; font-weight: bold; color: #27ae60;">95%</div>
                <div style="color: #555; font-size: 14px;">dos nossos clientes evitaram processos</div>
              </div>
            </div>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">💸 Custo Médio dos Problemas Trabalhistas:</h3>
            <ul style="color: #856404; margin: 0;">
              <li><strong>Processo simples:</strong> R$ 25.000 - R$ 80.000</li>
              <li><strong>Processo complexo:</strong> R$ 100.000 - R$ 300.000</li>
              <li><strong>Multas MTE:</strong> R$ 5.000 - R$ 50.000</li>
              <li><strong>Dano moral coletivo:</strong> R$ 50.000 - R$ 500.000</li>
            </ul>
          </div>

          <div style="background: linear-gradient(135deg, #aa8019, #d4a62a); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0;">🛡️ Como Nossos Clientes se Protegem</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 5px;">
                <strong>Preventivo Básico</strong><br>
                <span style="font-size: 14px;">R$ 500-800/mês</span><br>
                <small>Consultoria + documentos</small>
              </div>
              <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 5px;">
                <strong>Proteção Total</strong><br>
                <span style="font-size: 14px;">R$ 1.200-2.000/mês</span><br>
                <small>Tudo + defesa ilimitada</small>
              </div>
            </div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">🎯 Oferta Especial para Você</h3>
            <p style="color: #555;">
              Como você demonstrou interesse em proteger sua empresa, preparamos uma proposta especial:
            </p>
            <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center; margin: 15px 0;">
              <strong style="color: #2c3e50;">✨ PRIMEIRA CONSULTA GRATUITA ✨</strong><br>
              <span style="color: #555;">+ Análise de risco da sua empresa</span><br>
              <span style="color: #555;">+ Plano de proteção personalizado</span>
            </div>
            <div style="text-align: center;">
              <a href="tel:+551533844013" style="background: #aa8019; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                📞 Agendar Consulta Gratuita
              </a>
            </div>
          </div>

          <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #2c3e50; font-size: 14px;">
              <strong>🏆 20 anos de experiência | 200+ empresas protegidas</strong><br>
              "A tranquilidade de saber que estou protegido não tem preço" - Cliente desde 2019
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            D'avila Reis Advogados - Transformando dados em proteção real
          </p>
        </div>
      </div>
    `
  }
}

interface FollowUpData {
  type?: string
  lead_id?: string
  [key: string]: unknown
}

function validateFollowUpData(data: unknown): { isValid: boolean; errors: string[] } {
  const followUpData = data as FollowUpData
  const errors: string[] = []

  if (!followUpData.type || !['immediate', 'day1', 'day3', 'day7', 'day14', 'custom'].includes(followUpData.type)) {
    errors.push('Tipo deve ser immediate, day1, day3, day7, day14 ou custom')
  }

  if (followUpData.type === 'custom') {
    if (!followUpData.custom_message || !followUpData.custom_subject) {
      errors.push('custom_message e custom_subject são obrigatórios para tipo custom')
    }
  }

  if (followUpData.lead_id && typeof followUpData.lead_id !== 'string') {
    errors.push('Lead ID deve ser uma string')
  }

  if (followUpData.delay !== undefined && (typeof followUpData.delay !== 'number' || Number(followUpData.delay) < 0)) {
    errors.push('Delay deve ser um número positivo')
  }

  return { isValid: errors.length === 0, errors }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{sent: boolean, scheduled?: boolean, emailId: string}>>> {
  try {
    // Basic authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let body: FollowUpEmailRequest
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

    const validation = validateFollowUpData(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.errors.join('; ') 
        },
        { status: 400 }
      )
    }

    let lead: Lead | null = null
    
    if (body.lead_id) {
      lead = await LeadService.get_lead_by_id(body.lead_id)
      if (!lead) {
        return NextResponse.json(
          { success: false, error: 'Lead não encontrado' },
          { status: 404 }
        )
      }
    }

    const emailId = `FOLLOWUP_${body.type.toUpperCase()}_${body.lead_id || 'BULK'}_${Date.now()}`
    let emailSent = false
    let scheduled = false

    if (body.type === 'immediate') {
      // Send immediate follow-up
      if (lead) {
        emailSent = await sendFollowUpEmail(lead, body.type, body.custom_message, body.custom_subject)
      }
    } else if (body.type === 'custom') {
      // Send custom follow-up
      if (lead && body.custom_message && body.custom_subject) {
        emailSent = await sendCustomFollowUp(lead, body.custom_subject, body.custom_message)
      }
    } else {
      // Schedule follow-up for later (day1, day3, day7, etc.)
      if (lead) {
        const template = followUpTemplates[body.type]
        if (template) {
          // In production, this would be scheduled using a job queue
          console.log(`Follow-up scheduled: ${body.type} for lead ${lead.id} in ${template.delayDays} days`)
          scheduled = true
          
          // Update lead to track scheduled follow-up
          await LeadService.update_lead(body.lead_id!, {
            notes: `${lead.notes || ''}\n\n[${new Date().toISOString()}] Follow-up ${body.type} agendado para ${template.delayDays} dias`
          })
        }
      }
    }

    if (body.lead_id && (emailSent || scheduled)) {
      // Track interaction
      await LeadService.update_lead(body.lead_id, {
        last_contact: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: { sent: emailSent, scheduled, emailId },
      message: emailSent ? 'Follow-up enviado com sucesso' : scheduled ? 'Follow-up agendado com sucesso' : 'Follow-up processado'
    })

  } catch (error) {
    console.error('Error sending follow-up email:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}

async function sendFollowUpEmail(lead: Lead, type: string, custom_message?: string, custom_subject?: string): Promise<boolean> {
  const template = followUpTemplates[type]
  if (!template && !custom_message) {
    return false
  }

  const subject = custom_subject || template?.subject || 'Follow-up - D\'avila Reis Advogados'
  let content = custom_message || template?.content || ''
  
  // Replace template variables
  content = content
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{email\}\}/g, lead.email)
    .replace(/\{\{company\}\}/g, lead.company || 'sua empresa')
    .replace(/\{\{source\}\}/g, lead.source)

  return await EmailService.sendEmail({
    to: lead.email,
    subject,
    content
  })
}

async function sendCustomFollowUp(lead: Lead, subject: string, message: string): Promise<boolean> {
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
        <h1 style="color: #aa8019; margin: 0;">D'avila Reis Advogados</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #2c3e50;">Olá, ${lead.name}!</h2>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <div style="white-space: pre-wrap; line-height: 1.6; color: #555;">
            ${message}
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="tel:+551533844013" style="background: #aa8019; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            📞 Entre em Contato
          </a>
        </div>
      </div>
      
      <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0; font-size: 14px;">
          D'avila Reis Advogados - Sempre aqui para ajudar
        </p>
      </div>
    </div>
  `

  return await EmailService.sendEmail({
    to: lead.email,
    subject,
    content
  })
}

// GET /api/email/follow-up - Get follow-up email templates and manage campaigns
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
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
      return NextResponse.json({
        success: true,
        data: { 
          templates: Object.keys(followUpTemplates),
          campaigns: followUpTemplates 
        },
        message: 'Templates de follow-up disponíveis'
      })
    }

    if (action === 'pending') {
      // Find leads that need follow-up
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      const pendingLeads = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.status, 'Cold'),
            lte(leads.created_date, threeDaysAgo),
            isNull(leads.last_contact)
          )
        )
        .limit(50)
        .execute()

      return NextResponse.json({
        success: true,
        data: pendingLeads,
        message: `${pendingLeads.length} leads precisam de follow-up`
      })
    }

    return NextResponse.json(
      { success: false, error: 'Ação não reconhecida' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error getting follow-up data:', error)
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}