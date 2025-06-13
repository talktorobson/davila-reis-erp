// D'Avila Reis ERP - Email Service with SendGrid Integration

import { env, getFromEmail, getAppUrl } from './env'
import type { Lead, Client, Case, FinancialRecord } from '@/types'

interface EmailTemplate {
  templateId?: string
  subject: string
  content: string
  variables?: Record<string, any>
}

interface EmailOptions {
  to: string | string[]
  from?: string
  subject: string
  content: string
  templateId?: string
  templateData?: Record<string, any>
  attachments?: Array<{
    filename: string
    content: string
    type: string
  }>
}

export class EmailService {
  private static readonly FROM_EMAIL = getFromEmail()
  private static readonly SENDGRID_API_KEY = env.SENDGRID_API_KEY
  private static readonly NOTIFICATION_EMAIL = env.NOTIFICATION_EMAIL || getFromEmail()
  private static readonly APP_URL = getAppUrl()

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured')
      return false
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: Array.isArray(options.to) 
              ? options.to.map(email => ({ email }))
              : [{ email: options.to }],
            dynamic_template_data: options.templateData || {}
          }],
          from: { email: options.from || this.FROM_EMAIL },
          subject: options.subject,
          content: options.templateId ? undefined : [{
            type: 'text/html',
            value: options.content
          }],
          template_id: options.templateId,
          attachments: options.attachments
        })
      })

      return response.ok
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  // Lead-related emails
  static async sendLeadNotification(lead: Lead): Promise<boolean> {
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">🎯 Novo Lead Recebido!</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #aa8019; padding-bottom: 10px;">
            Informações do Lead
          </h2>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Nome:</td>
                <td style="padding: 10px;">${lead.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 10px;"><a href="mailto:${lead.email}" style="color: #aa8019;">${lead.email}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Telefone:</td>
                <td style="padding: 10px;"><a href="tel:${lead.phone}" style="color: #aa8019;">${lead.phone}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Empresa:</td>
                <td style="padding: 10px;">${lead.company || 'Não informado'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Fonte:</td>
                <td style="padding: 10px;"><span style="background: #aa8019; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">${lead.source}</span></td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Score:</td>
                <td style="padding: 10px;">${lead.lead_score}/10</td>
              </tr>
              ${lead.service_interest && lead.service_interest.length > 0 ? `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Serviços de Interesse:</td>
                <td style="padding: 10px;">${Array.isArray(lead.service_interest) ? lead.service_interest.join(', ') : lead.service_interest}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${lead.initial_message ? `
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">💬 Mensagem:</h3>
            <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-style: italic;">
              "${lead.initial_message}"
            </p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/admin/crm?lead=${lead.id}" 
               style="background: #aa8019; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              📊 Ver no CRM
            </a>
          </div>

          <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
            <p style="margin: 0; color: #2c3e50;">
              <strong>⏰ Próxima ação:</strong> Entre em contato em até 2 horas para maximizar a conversão
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">D'avila Reis Advogados - Sistema ERP/CRM</p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: this.NOTIFICATION_EMAIL,
      subject: `🎯 Novo Lead: ${lead.name} - ${lead.source}`,
      content
    })
  }

  static async sendLeadWelcomeEmail(lead: Lead): Promise<boolean> {
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">D'avila Reis Advogados</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Protegemos Seu Negócio e Patrimônio</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">Olá, ${lead.name}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Obrigado por entrar em contato com a <strong>D'avila Reis Advogados</strong>. 
            Recebemos sua mensagem e nossa equipe especializada já está analisando sua solicitação.
          </p>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #aa8019;">
            <h3 style="color: #2c3e50; margin-top: 0;">🛡️ Nossa Especialidade</h3>
            <p style="color: #555; margin-bottom: 0;">
              <strong>20 anos</strong> protegendo empresários contra processos que podem atingir o patrimônio pessoal.
              Somos especialistas em direito trabalhista preventivo e defesa empresarial.
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #aa8019, #d4a62a); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0;">⏰ Próximos Passos</h3>
            <p style="margin-bottom: 15px;">Entraremos em contato em até <strong>24 horas</strong> para:</p>
            <ul style="text-align: left; margin: 0; padding-left: 20px;">
              <li>Analisar seu caso específico</li>
              <li>Oferecer consultoria gratuita</li>
              <li>Apresentar nossas soluções</li>
            </ul>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">📞 Precisa falar conosco agora?</h3>
            <p style="color: #555; margin-bottom: 15px;">Entre em contato pelos canais abaixo:</p>
            
            <div style="display: flex; flex-wrap: wrap; gap: 15px;">
              <a href="tel:+551533844013" style="color: #aa8019; text-decoration: none; display: flex; align-items: center;">
                📞 (15) 3384-4013
              </a>
              <a href="https://wa.me/5515999999999" style="color: #25d366; text-decoration: none; display: flex; align-items: center;">
                💬 WhatsApp
              </a>
              <a href="mailto:financeiro@davilareisadvogados.com.br" style="color: #aa8019; text-decoration: none; display: flex; align-items: center;">
                📧 E-mail
              </a>
            </div>
          </div>

          <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #2c3e50; font-size: 14px;">
              <strong>🏆 Confiança de 200+ empresários</strong><br>
              2.500+ processos gerenciados | 20 anos de experiência
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px;">
            <strong>D'avila Reis Advogados</strong><br>
            Av. Dr. Vinício Gagliardi, 675 - Centro, Cerquilho/SP
          </p>
          <p style="margin: 0; font-size: 12px; opacity: 0.8;">
            Este é um e-mail automático. Para responder, utilize nossos canais de contato.
          </p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: lead.email,
      subject: `🛡️ Recebemos sua mensagem - D'avila Reis Advogados`,
      content
    })
  }

  // Client-related emails
  static async sendClientWelcomeEmail(client: Client): Promise<boolean> {
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">Bem-vindo à Família D'avila Reis!</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">Olá, ${client.contact_person}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            É com grande satisfação que recebemos a <strong>${client.company_name}</strong> 
            como nossa nova cliente. Agora você conta com a proteção e expertise de 20 anos 
            no direito empresarial.
          </p>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">📱 Portal do Cliente</h3>
            <p style="color: #555;">
              Agora você tem acesso ao nosso Portal do Cliente 24/7, onde pode:
            </p>
            <ul style="color: #555; margin: 10px 0;">
              <li>Acompanhar o andamento dos seus casos</li>
              <li>Visualizar documentos e contratos</li>
              <li>Comunicar-se diretamente conosco</li>
              <li>Acessar faturas e comprovantes</li>
            </ul>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.APP_URL}/portal" 
                 style="background: #aa8019; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                🚀 Acessar Portal
              </a>
            </div>
          </div>

          <div style="background: linear-gradient(135deg, #aa8019, #d4a62a); color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="margin-top: 0;">🎯 Próximos Passos</h3>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Análise inicial dos seus processos</li>
              <li>Criação do plano de proteção personalizado</li>
              <li>Implementação das medidas preventivas</li>
              <li>Acompanhamento contínuo</li>
            </ol>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">👨‍💼 Sua Equipe Dedicada</h3>
            <p style="color: #555;">
              <strong>Advogado Responsável:</strong> ${client.primary_lawyer}<br>
              <strong>Serviços Contratados:</strong> ${Array.isArray(client.services_contracted) ? client.services_contracted.join(', ') : client.services_contracted || 'Não informado'}
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            <strong>D'avila Reis Advogados</strong> - Protegendo seu negócio e patrimônio desde 2004
          </p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: client.email,
      subject: `🎉 Bem-vindo à D'avila Reis Advogados - ${client.company_name}`,
      content
    })
  }

  // Invoice-related emails
  static async sendInvoiceEmail(invoice: FinancialRecord, client: Client): Promise<boolean> {
    const dueDate = new Date(invoice.due_date || '').toLocaleDateString('pt-BR')
    const amount = Number(invoice.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">💼 Nova Fatura Disponível</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">Olá, ${client.contact_person}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Uma nova fatura foi gerada para <strong>${client.company_name}</strong>. 
            Confira os detalhes abaixo:
          </p>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #aa8019;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Número da Fatura:</td>
                <td style="padding: 10px; color: #aa8019; font-weight: bold;">${invoice.invoice_number}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Descrição:</td>
                <td style="padding: 10px;">${invoice.description}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Valor:</td>
                <td style="padding: 10px; font-size: 18px; font-weight: bold; color: #2c3e50;">${amount}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Vencimento:</td>
                <td style="padding: 10px; color: #e74c3c; font-weight: bold;">${dueDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #555;">Status:</td>
                <td style="padding: 10px;">
                  <span style="background: #f39c12; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">
                    ${invoice.status}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/portal/invoices/${invoice.id}" 
               style="background: #aa8019; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              📄 Ver Fatura Completa
            </a>
          </div>

          ${invoice.payment_link ? `
          <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; text-align: center;">
            <h3 style="color: #2c3e50; margin-top: 0;">💳 Pagar Agora</h3>
            <p style="color: #555; margin-bottom: 15px;">Pague de forma rápida e segura:</p>
            <a href="${invoice.payment_link}" 
               style="background: #27ae60; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              💰 Pagar Online
            </a>
          </div>
          ` : ''}

          <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px;">
            <p style="margin: 0; color: #555;">
              <strong>💡 Dica:</strong> Pagamentos via PIX são processados instantaneamente. 
              Para outros métodos, o processamento pode levar até 2 dias úteis.
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            <strong>D'avila Reis Advogados</strong><br>
            📞 (15) 3384-4013 | 📧 financeiro@davilareisadvogados.com.br
          </p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: client.email,
      subject: `💼 Nova Fatura - ${invoice.invoice_number} - ${amount}`,
      content
    })
  }

  static async sendPaymentReminderEmail(invoice: FinancialRecord, client: Client): Promise<boolean> {
    const daysOverdue = invoice.days_overdue || 0
    const amount = Number(invoice.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const urgencyColor = daysOverdue > 30 ? '#e74c3c' : daysOverdue > 0 ? '#f39c12' : '#3498db'
    const urgencyText = daysOverdue > 30 ? 'URGENTE' : daysOverdue > 0 ? 'ATRASADA' : 'VENCE HOJE'

    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">⚠️ LEMBRETE DE PAGAMENTO - ${urgencyText}</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">Prezado(a) ${client.contact_person},</h2>
          
          <p style="color: #555; line-height: 1.6;">
            ${daysOverdue > 0 
              ? `A fatura <strong>${invoice.invoice_number}</strong> está <strong>${daysOverdue} dia(s) em atraso</strong>.`
              : `A fatura <strong>${invoice.invoice_number}</strong> vence hoje.`
            }
          </p>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid ${urgencyColor};">
            <h3 style="color: #2c3e50; margin-top: 0;">📋 Detalhes da Fatura</h3>
            <p style="margin: 5px 0;"><strong>Número:</strong> ${invoice.invoice_number}</p>
            <p style="margin: 5px 0;"><strong>Valor:</strong> <span style="font-size: 20px; color: ${urgencyColor}; font-weight: bold;">${amount}</span></p>
            <p style="margin: 5px 0;"><strong>Vencimento:</strong> ${new Date(invoice.due_date || '').toLocaleDateString('pt-BR')}</p>
            ${daysOverdue > 0 ? `<p style="margin: 5px 0; color: ${urgencyColor}; font-weight: bold;">Dias em atraso: ${daysOverdue}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/portal/invoices/${invoice.id}" 
               style="background: ${urgencyColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px;">
              💰 PAGAR AGORA
            </a>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">⏰ Formas de Pagamento Aceitas:</h4>
            <ul style="margin: 0; color: #856404;">
              <li>PIX (processamento instantâneo)</li>
              <li>Transferência bancária</li>
              <li>Boleto bancário</li>
              <li>Cartão de crédito/débito</li>
            </ul>
          </div>

          <div style="background: white; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #555; font-size: 14px;">
              <strong>Dúvidas sobre a fatura?</strong><br>
              Entre em contato: 📞 (15) 3384-4013 | 📧 financeiro@davilareisadvogados.com.br
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            D'avila Reis Advogados - Continuamos protegendo seu negócio
          </p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: client.email,
      subject: `⚠️ ${urgencyText} - Fatura ${invoice.invoice_number} - ${amount}`,
      content
    })
  }

  // Case-related emails
  static async sendCaseUpdateEmail(case_: Case, client: Client, update: string): Promise<boolean> {
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="color: #aa8019; margin: 0;">📋 Atualização do Caso</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50;">Olá, ${client.contact_person}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Há uma nova atualização sobre o caso <strong>${case_.case_title}</strong>.
          </p>

          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">📝 Detalhes do Caso</h3>
            <p><strong>Número:</strong> ${case_.case_number}</p>
            <p><strong>Título:</strong> ${case_.case_title}</p>
            <p><strong>Status:</strong> <span style="background: #aa8019; color: white; padding: 3px 8px; border-radius: 10px; font-size: 12px;">${case_.status}</span></p>
            <p><strong>Progresso:</strong> ${case_.progress_percentage || 0}%</p>
            <p><strong>Advogado Responsável:</strong> ${case_.assigned_lawyer}</p>
          </div>

          <div style="background: linear-gradient(135deg, #e8f4fd, #d1ecf1); padding: 20px; border-radius: 10px; border-left: 4px solid #3498db;">
            <h3 style="color: #2c3e50; margin-top: 0;">🔔 Atualização</h3>
            <p style="color: #2c3e50; margin-bottom: 0; white-space: pre-line;">${update}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/portal/cases/${case_.id}" 
               style="background: #aa8019; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              📊 Ver Detalhes Completos
            </a>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            D'avila Reis Advogados - Mantendo você sempre informado
          </p>
        </div>
      </div>
    `

    return this.sendEmail({
      to: client.email,
      subject: `📋 Atualização: ${case_.case_title} - ${case_.case_number}`,
      content
    })
  }
}

export default EmailService