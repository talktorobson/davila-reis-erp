// D'Avila Reis ERP - Contact Management Service

import type { ContactFormData } from '@/types'

export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  message: string
  source: string
  submitted_at: Date
  ip_address?: string
  user_agent?: string
  responded: boolean
  response_date?: Date
  priority: 'low' | 'medium' | 'high' | 'urgent'
  tags: string[]
  assigned_to?: string
  notes?: string
}

export class ContactService {
  
  /**
   * Process contact form submission and determine priority
   */
  static process_contact_submission(
    data: ContactFormData, 
    metadata: {
      ip_address?: string
      user_agent?: string
      source?: string
    }
  ): ContactSubmission {
    const id = `CONTACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Determine priority based on message content and urgency
    const priority = this.determine_priority(data.message || '')
    
    // Extract tags from message
    const tags = this.extract_tags(data.message || '')
    
    return {
      id,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      company: data.company?.trim(),
      message: data.message?.trim() || '',
      source: metadata.source || 'website',
      submitted_at: new Date(),
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      responded: false,
      priority,
      tags,
      assigned_to: this.assign_contact_handler(priority, tags)
    }
  }

  /**
   * Determine contact priority based on message content
   */
  private static determine_priority(message: string): 'low' | 'medium' | 'high' | 'urgent' {
    const lowercase_message = message.toLowerCase()
    
    // Urgent indicators
    const urgent_keywords = [
      'urgente', 'emergencial', 'imediato', 'hoje', 'agora',
      'processo', 'tribunal', 'intimação', 'multa', 'fiscalização',
      'demanda judicial', 'prazo fatal', 'citação'
    ]
    
    // High priority indicators
    const high_keywords = [
      'importante', 'prazo', 'rescisão', 'demissão', 'funcionário',
      'trabalhista', 'ministério do trabalho', 'sindicato', 'greve',
      'acidente', 'problema sério', 'consultoria'
    ]
    
    // Medium priority indicators
    const medium_keywords = [
      'dúvida', 'orientação', 'contrato', 'acordo', 'preventivo',
      'compliance', 'auditoria', 'treinamento', 'regularização'
    ]
    
    if (urgent_keywords.some(keyword => lowercase_message.includes(keyword))) {
      return 'urgent'
    }
    
    if (high_keywords.some(keyword => lowercase_message.includes(keyword))) {
      return 'high'
    }
    
    if (medium_keywords.some(keyword => lowercase_message.includes(keyword))) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Extract relevant tags from message content
   */
  private static extract_tags(message: string): string[] {
    const lowercase_message = message.toLowerCase()
    const tags: string[] = []
    
    const tag_mapping: Record<string, string[]> = {
      'trabalhista': ['processo trabalhista', 'rescisão', 'funcionário', 'empregado', 'clt', 'salário'],
      'urgente': ['urgente', 'emergencial', 'imediato', 'prazo fatal'],
      'fiscal': ['fiscalização', 'ministério do trabalho', 'auditoria', 'multa'],
      'preventivo': ['preventivo', 'consultoria', 'orientação', 'compliance'],
      'contrato': ['contrato', 'acordo', 'terceirização'],
      'demissão': ['demissão', 'rescisão', 'aviso prévio'],
      'processo': ['processo', 'tribunal', 'ação judicial', 'citação'],
      'empresa': ['empresa', 'empresário', 'cnpj', 'negócio'],
      'patrimônio': ['patrimônio', 'bens pessoais', 'proteção patrimonial']
    }
    
    for (const [tag, keywords] of Object.entries(tag_mapping)) {
      if (keywords.some(keyword => lowercase_message.includes(keyword))) {
        tags.push(tag)
      }
    }
    
    return tags
  }

  /**
   * Assign contact handler based on priority and specialization
   */
  private static assign_contact_handler(priority: string, tags: string[]): string {
    // In production, this would query the staff database
    // For now, use simple assignment logic
    
    if (priority === 'urgent') {
      return 'Dr. D\'avila Reis' // Senior partner for urgent matters
    }
    
    if (tags.includes('trabalhista') || tags.includes('processo')) {
      return 'Dr. D\'avila Reis' // Specialization in labor law
    }
    
    if (tags.includes('preventivo') || tags.includes('contrato')) {
      return 'Dra. Maria Silva' // Business consultant
    }
    
    return 'Recepção' // Default assignment
  }

  /**
   * Generate automated response suggestions based on contact content
   */
  static generate_response_suggestions(contact: ContactSubmission): string[] {
    const suggestions: string[] = []
    
    if (contact.priority === 'urgent') {
      suggestions.push('Ligar imediatamente - situação urgente identificada')
      suggestions.push('Agendar reunião para hoje ou amanhã')
    }
    
    if (contact.tags.includes('trabalhista')) {
      suggestions.push('Explicar nossos serviços de defesa trabalhista')
      suggestions.push('Mencionar nossa experiência de 20 anos')
      suggestions.push('Oferecer análise gratuita do caso')
    }
    
    if (contact.tags.includes('preventivo')) {
      suggestions.push('Destacar nossos serviços preventivos')
      suggestions.push('Explicar o custo-benefício da prevenção')
      suggestions.push('Agendar consultoria inicial')
    }
    
    if (contact.tags.includes('processo')) {
      suggestions.push('Solicitar documentos do processo')
      suggestions.push('Explicar nossos honorários de defesa')
      suggestions.push('Agendar reunião urgente')
    }
    
    if (contact.company) {
      suggestions.push('Perguntar sobre o porte da empresa')
      suggestions.push('Identificar principais riscos do setor')
      suggestions.push('Oferecer plano de proteção empresarial')
    }
    
    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('Agradecer o contato')
      suggestions.push('Agendar conversa para entender melhor a situação')
      suggestions.push('Explicar nossos serviços principais')
    }
    
    return suggestions
  }

  /**
   * Generate contact summary for quick review
   */
  static generate_contact_summary(contact: ContactSubmission): string {
    const parts: string[] = []
    
    if (contact.company) {
      parts.push(`Empresa: ${contact.company}`)
    }
    
    parts.push(`Prioridade: ${contact.priority.toUpperCase()}`)
    
    if (contact.tags.length > 0) {
      parts.push(`Assuntos: ${contact.tags.join(', ')}`)
    }
    
    if (contact.assigned_to) {
      parts.push(`Atribuído a: ${contact.assigned_to}`)
    }
    
    const message_preview = contact.message.length > 100 
      ? contact.message.substring(0, 100) + '...'
      : contact.message
    
    parts.push(`Mensagem: "${message_preview}"`)
    
    return parts.join(' | ')
  }

  /**
   * Validate contact data completeness and quality
   */
  static validate_contact_quality(contact: ContactSubmission): {
    score: number
    issues: string[]
    suggestions: string[]
  } {
    let score = 70 // Base score
    const issues: string[] = []
    const suggestions: string[] = []
    
    // Name quality
    if (contact.name.length < 3) {
      score -= 10
      issues.push('Nome muito curto')
    }
    
    // Email quality
    const email_domain = contact.email.split('@')[1]?.toLowerCase()
    if (email_domain && ['gmail.com', 'hotmail.com', 'yahoo.com'].includes(email_domain)) {
      score -= 5
      suggestions.push('Email pessoal - verificar se é empresarial')
    } else {
      score += 5
    }
    
    // Phone quality
    if (contact.phone.length < 10) {
      score -= 15
      issues.push('Telefone incompleto ou inválido')
    }
    
    // Company presence
    if (!contact.company) {
      score -= 10
      suggestions.push('Identificar empresa durante contato')
    } else {
      score += 10
    }
    
    // Message quality
    if (contact.message.length < 20) {
      score -= 15
      issues.push('Mensagem muito curta')
    } else if (contact.message.length > 50) {
      score += 10
    }
    
    // Priority adjustment
    if (contact.priority === 'urgent') {
      score += 15
    } else if (contact.priority === 'high') {
      score += 10
    }
    
    // Tags indicate specificity
    if (contact.tags.length > 0) {
      score += contact.tags.length * 5
    }
    
    // Ensure score bounds
    score = Math.max(0, Math.min(100, score))
    
    return { score, issues, suggestions }
  }

  /**
   * Determine follow-up schedule based on priority and content
   */
  static get_follow_up_schedule(contact: ContactSubmission): {
    immediate: boolean
    follow_up_hours: number[]
    max_response_time: number
  } {
    switch (contact.priority) {
      case 'urgent':
        return {
          immediate: true,
          follow_up_hours: [1, 4, 8],
          max_response_time: 2 // 2 hours max
        }
      
      case 'high':
        return {
          immediate: false,
          follow_up_hours: [4, 24, 72],
          max_response_time: 4 // 4 hours max
        }
      
      case 'medium':
        return {
          immediate: false,
          follow_up_hours: [24, 72, 168], // 1 day, 3 days, 1 week
          max_response_time: 24 // 24 hours max
        }
      
      default:
        return {
          immediate: false,
          follow_up_hours: [48, 168, 336], // 2 days, 1 week, 2 weeks
          max_response_time: 48 // 48 hours max
        }
    }
  }
}