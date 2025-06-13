// D'Avila Reis ERP - Lead Processing and Management Service

import { db } from '@/lib/database'
import { leads, staff } from '@/lib/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import type { Lead, NewLead, LeadFormData } from '@/types'

export class LeadService {
  
  /**
   * Calculate lead score based on multiple factors
   * Score range: 1-10 (10 being highest quality)
   */
  static calculate_lead_score(data: LeadFormData): number {
    let score = 5 // Base score

    // Source scoring
    const sourceScores: Record<string, number> = {
      'Google Ads': 2,
      'Website': 1,
      'Referral': 3,
      'WhatsApp': 1,
      'Social Media': 0,
      'Career Page': -1
    }
    score += sourceScores[data.source] || 0

    // Company presence (+1)
    if (data.company && data.company.trim().length > 0) {
      score += 1
    }

    // Message quality and urgency indicators
    if (data.message) {
      const message = data.message.toLowerCase()
      
      // Urgency keywords (+2)
      const urgencyKeywords = ['urgente', 'importante', 'prazo', 'processo', 'tribunal', 'multa', 'fiscalização']
      if (urgencyKeywords.some(keyword => message.includes(keyword))) {
        score += 2
      }

      // Business keywords (+1)
      const businessKeywords = ['empresa', 'funcionário', 'trabalhista', 'rescisão', 'contrato', 'demissão']
      if (businessKeywords.some(keyword => message.includes(keyword))) {
        score += 1
      }

      // Pain point keywords (+1)
      const painKeywords = ['problema', 'dificuldade', 'ajuda', 'orientação', 'consultoria']
      if (painKeywords.some(keyword => message.includes(keyword))) {
        score += 1
      }

      // Detailed message (+1)
      if (message.length > 100) {
        score += 1
      }
    }

    // Phone format indicates business (+1 for landline)
    if (data.phone && /^\(?[1-9]{2}\)?\s?[2-5]\d{3}[-\s]?\d{4}$/.test(data.phone)) {
      score += 1
    }

    // Email domain analysis
    if (data.email) {
      const domain = data.email.split('@')[1]?.toLowerCase()
      
      // Business email domains (+1)
      if (domain && !['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'].includes(domain)) {
        score += 1
      }
    }

    // UTM Campaign scoring
    if (data.utmCampaign) {
      const campaign = data.utmCampaign.toLowerCase()
      if (campaign.includes('trabalhista') || campaign.includes('empresarial')) {
        score += 1
      }
    }

    // Ensure score stays within bounds
    return Math.max(1, Math.min(10, score))
  }

  /**
   * Calculate conversion probability based on lead score and source
   */
  static calculate_conversion_probability(lead_score: number, source: string): number {
    // Base probability by source
    const source_probabilities: Record<string, number> = {
      'Referral': 75,
      'Google Ads': 45,
      'Website': 35,
      'WhatsApp': 30,
      'Social Media': 20,
      'Career Page': 10
    }

    const base_probability = source_probabilities[source] || 25

    // Adjust based on lead score
    const score_multiplier = lead_score / 5 // Score 5 = 1.0x, Score 10 = 2.0x
    const adjusted_probability = base_probability * score_multiplier

    return Math.round(Math.max(5, Math.min(95, adjusted_probability)))
  }

  /**
   * Determine region based on phone area code
   */
  static determine_region_from_phone(phone: string): 'Região 1 (015 Cerquilho)' | 'Região 2 (019 Campinas)' | 'Região 3 (011 SP Sul)' | 'Região 4 (011 SP Oeste)' | 'Região 5 (013 Litoral)' {
    // Extract area code from phone
    const area_code_match = phone.match(/^\(?([1-9]{2})\)?/)
    const area_code = area_code_match ? area_code_match[1] : null

    if (!area_code) {
      return 'Região 1 (015 Cerquilho)' // Default
    }

    // Area code to region mapping
    const region_mapping: Record<string, 'Região 1 (015 Cerquilho)' | 'Região 2 (019 Campinas)' | 'Região 3 (011 SP Sul)' | 'Região 4 (011 SP Oeste)' | 'Região 5 (013 Litoral)'> = {
      '15': 'Região 1 (015 Cerquilho)',
      '19': 'Região 2 (019 Campinas)',
      '11': phone.includes('9') && phone.length >= 10 ? 'Região 4 (011 SP Oeste)' : 'Região 3 (011 SP Sul)',
      '13': 'Região 5 (013 Litoral)',
      // Fallback for nearby regions
      '14': 'Região 2 (019 Campinas)',
      '16': 'Região 2 (019 Campinas)',
      '17': 'Região 2 (019 Campinas)',
      '18': 'Região 1 (015 Cerquilho)',
      '12': 'Região 5 (013 Litoral)'
    }

    return region_mapping[area_code] || 'Região 1 (015 Cerquilho)'
  }

  /**
   * Assign lawyer based on region and current workload
   */
  static async assign_lawyer_by_region(region: 'Região 1 (015 Cerquilho)' | 'Região 2 (019 Campinas)' | 'Região 3 (011 SP Sul)' | 'Região 4 (011 SP Oeste)' | 'Região 5 (013 Litoral)'): Promise<string> {
    try {
      // Get active staff for the region
      const region_staff = await db
        .select()
        .from(staff)
        .where(
          and(
            eq(staff.status, 'Active'),
            eq(staff.primary_region, region)
          )
        )
        .execute()

      if (region_staff.length === 0) {
        // Fallback to any active lawyer
        const any_staff = await db
          .select()
          .from(staff)
          .where(eq(staff.status, 'Active'))
          .limit(1)
          .execute()

        return any_staff[0]?.full_name || 'Dr. D\'avila Reis'
      }

      // Simple round-robin assignment (in production, consider workload balancing)
      const random_index = Math.floor(Math.random() * region_staff.length)
      return region_staff[random_index].full_name
      
    } catch (error) {
      console.error('Error assigning lawyer:', error)
      return 'Dr. D\'avila Reis' // Default assignment
    }
  }

  /**
   * Update existing lead
   */
  static async update_lead(lead_id: string, update_data: Partial<NewLead>): Promise<Lead | null> {
    try {
      const [updated_lead] = await db
        .update(leads)
        .set({
          ...update_data,
          updated_at: new Date()
        })
        .where(eq(leads.id, lead_id))
        .returning()
        .execute()

      return updated_lead || null
    } catch (error) {
      console.error('Error updating lead:', error)
      return null
    }
  }

  /**
   * Get lead by ID
   */
  static async get_lead_by_id(lead_id: string): Promise<Lead | null> {
    try {
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, lead_id))
        .limit(1)
        .execute()

      return lead || null
    } catch (error) {
      console.error('Error getting lead:', error)
      return null
    }
  }

  /**
   * Get leads with filtering and pagination
   */
  static async get_leads(options: {
    page?: number
    limit?: number
    status?: string
    source?: string
    assigned_lawyer?: string
    region?: string
    min_score?: number
  } = {}): Promise<{ leads: Lead[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        source,
        assigned_lawyer,
        region,
        min_score
      } = options

      let query: any = db.select().from(leads)
      let countQuery: any = db.select({ count: sql<number>`count(*)` }).from(leads)

      // Apply filters
      const conditions = []
      if (status) conditions.push(eq(leads.status, status as any))
      if (source) conditions.push(eq(leads.source, source as any))
      if (assigned_lawyer) conditions.push(eq(leads.assigned_lawyer, assigned_lawyer))
      if (region) conditions.push(eq(leads.region, region as any))
      if (min_score) conditions.push(sql`${leads.lead_score} >= ${min_score}`)

      if (conditions.length > 0) {
        const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)
        query = query.where(whereClause!)
        countQuery = countQuery.where(whereClause!)
      }

      // Execute queries
      const offset = (page - 1) * limit
      const [leads_result, total_result] = await Promise.all([
        query.orderBy(desc(leads.created_date)).limit(limit).offset(offset).execute(),
        countQuery.execute()
      ])

      return {
        leads: leads_result,
        total: total_result[0]?.count || 0
      }
    } catch (error) {
      console.error('Error getting leads:', error)
      return { leads: [], total: 0 }
    }
  }

  /**
   * Convert lead to client
   */
  static async convert_lead_to_client(lead_id: string, client_data: { id: string; [key: string]: unknown }): Promise<boolean> {
    try {
      // This would integrate with client creation service
      // For now, just update lead status
      const updated_lead = await this.update_lead(lead_id, {
        status: 'Converted',
        converted_to_client_id: client_data.id
      })

      return updated_lead !== null
    } catch (error) {
      console.error('Error converting lead to client:', error)
      return false
    }
  }

  /**
   * Mark lead as lost with reason
   */
  static async mark_lead_as_lost(lead_id: string, reason: string): Promise<boolean> {
    try {
      const lead = await this.get_lead_by_id(lead_id)
      if (!lead) return false

      const updated_lead = await this.update_lead(lead_id, {
        status: 'Lost',
        notes: `${lead.notes || ''}\n\n[${new Date().toISOString()}] Lead perdido: ${reason}`
      })

      return updated_lead !== null
    } catch (error) {
      console.error('Error marking lead as lost:', error)
      return false
    }
  }

  /**
   * Get lead statistics
   */
  static async get_lead_stats(): Promise<{
    total: number
    by_status: Record<string, number>
    by_source: Record<string, number>
    average_score: number
    conversion_rate: number
  }> {
    try {
      const all_leads = await db.select().from(leads).execute()

      const stats = {
        total: all_leads.length,
        by_status: {} as Record<string, number>,
        by_source: {} as Record<string, number>,
        average_score: 0,
        conversion_rate: 0
      }

      if (all_leads.length === 0) return stats

      // Calculate statistics
      let total_score = 0
      let converted_count = 0

      all_leads.forEach(lead => {
        // Status distribution
        stats.by_status[lead.status] = (stats.by_status[lead.status] || 0) + 1

        // Source distribution  
        stats.by_source[lead.source] = (stats.by_source[lead.source] || 0) + 1

        // Score calculation
        total_score += lead.lead_score || 0

        // Conversion tracking
        if (lead.status === 'Converted') {
          converted_count++
        }
      })

      stats.average_score = Math.round((total_score / all_leads.length) * 10) / 10
      stats.conversion_rate = Math.round((converted_count / all_leads.length) * 100 * 10) / 10

      return stats
    } catch (error) {
      console.error('Error getting lead stats:', error)
      return {
        total: 0,
        by_status: {},
        by_source: {},
        average_score: 0,
        conversion_rate: 0
      }
    }
  }

  /**
   * Schedule follow-up for lead
   */
  static async schedule_follow_up(lead_id: string, follow_up_date: Date, notes?: string): Promise<boolean> {
    try {
      const lead = await this.get_lead_by_id(lead_id)
      if (!lead) return false

      const updated_lead = await this.update_lead(lead_id, {
        next_follow_up: follow_up_date,
        notes: notes 
          ? `${lead.notes || ''}\n\n[${new Date().toISOString()}] Follow-up agendado: ${notes}`
          : lead.notes
      })

      return updated_lead !== null
    } catch (error) {
      console.error('Error scheduling follow-up:', error)
      return false
    }
  }
}