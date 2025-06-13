// D'Avila Reis ERP - Lead Capture API Endpoint
// POST /api/leads - Creates new leads with validation, scoring, and email automation
// GET /api/leads - Retrieve leads with filtering and pagination (admin only)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq, or, and, sql } from 'drizzle-orm'
import { db } from '@/lib/database'
import { leads } from '@/lib/schema'
import { LeadService } from '@/lib/services/lead-service'
import { EmailService } from '@/lib/email'
import { 
  createSuccessResponse, 
  createPaginatedResponse,
  errors, 
  validateRequest,
  withErrorHandling,
  requireAuth,
  requireRole,
  calculatePagination
} from '@/lib/api-response'
import { getRateLimitConfig } from '@/lib/env'

// Validation schemas
const leadCreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  email: z.string().email('Email deve ter um formato válido').max(320),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').max(20),
  company: z.string().max(255).optional(),
  message: z.string().max(5000).optional(),
  source: z.enum(['Website', 'Google Ads', 'Referral', 'Social Media', 'WhatsApp', 'Career Page']).default('Website'),
  utm_campaign: z.string().max(255).optional(),
}).transform(data => ({
  ...data,
  name: data.name.trim(),
  email: data.email.toLowerCase().trim(),
  phone: data.phone.trim(),
  company: data.company?.trim(),
  message: data.message?.trim(),
  utm_campaign: data.utm_campaign?.trim(),
}))


// Rate limiting configuration
const rateLimitConfig = getRateLimitConfig()
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = rateLimitConfig.requests

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

// POST /api/leads - Create new lead
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            '127.0.0.1'
  
  if (!checkRateLimit(ip)) {
    throw errors.rateLimited('Muitas tentativas. Tente novamente em 15 minutos.')
  }

  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateRequest(leadCreateSchema, body) as z.infer<typeof leadCreateSchema>

  // Check for duplicate leads (same email or phone in last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const existingLeads = await db
    .select()
    .from(leads)
    .where(
      and(
        or(
          eq(leads.email, validatedData.email),
          eq(leads.phone, validatedData.phone)
        ),
        sql`${leads.created_at} > ${yesterday}`
      )
    )

  if (existingLeads.length > 0) {
    const recentLead = existingLeads[0]
    
    // Update existing lead instead of creating duplicate
    const updatedLead = await LeadService.update_lead(recentLead.id, {
      initial_message: validatedData.message || recentLead.initial_message,
      source: validatedData.source,
      utm_campaign: validatedData.utm_campaign || recentLead.utm_campaign,
      notes: `${recentLead.notes || ''}\n\n[${new Date().toISOString()}] Novo contato: ${validatedData.message || 'Sem mensagem adicional'}`
    })

    if (updatedLead) {
      return createSuccessResponse(updatedLead, 'Lead atualizado com sucesso')
    }
  }

  // Calculate lead score and assign lawyer
  const leadScore = LeadService.calculate_lead_score(validatedData)
  const region = LeadService.determine_region_from_phone(validatedData.phone)
  const assignedLawyer = await LeadService.assign_lawyer_by_region(region)

  // Create new lead
  const leadData = {
    name: validatedData.name,
    email: validatedData.email,
    phone: validatedData.phone,
    company: validatedData.company || null,
    source: validatedData.source,
    initial_message: validatedData.message || null,
    lead_score: leadScore,
    region,
    assigned_lawyer: assignedLawyer,
    utm_campaign: validatedData.utm_campaign || null,
    service_interest: [],
    conversion_probability: LeadService.calculate_conversion_probability(leadScore, validatedData.source),
    created_by: 'website-form'
  }

  const [newLead] = await db
    .insert(leads)
    .values(leadData)
    .returning()

  if (!newLead) {
    throw errors.database('Falha ao criar lead no banco de dados')
  }

  // Send notifications asynchronously (don't block response)
  Promise.all([
    EmailService.sendLeadNotification(newLead),
    EmailService.sendLeadWelcomeEmail(newLead),
  ]).catch(error => {
    console.error('Error sending lead emails:', error)
  })

  return createSuccessResponse(
    newLead, 
    'Lead criado com sucesso! Nossa equipe entrará em contato em breve.',
    201
  )
})

// GET /api/leads - Retrieve leads (admin only)
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Authentication required
  requireAuth(request)
  // TODO: Validate JWT token and get user role
  // For now, assume admin role
  requireRole('admin', ['admin'])

  // Parse and validate query parameters
  const { searchParams } = new URL(request.url)
  const queryParams = Object.fromEntries(searchParams.entries())
  
  // Manual parsing to avoid Zod transformation issues
  const page = parseInt(queryParams.page || '1') 
  const limit = Math.min(parseInt(queryParams.limit || '10'), 100)
  const status = queryParams.status as 'Cold' | 'Warm' | 'Hot' | 'Qualified' | 'Lost' | 'Converted' | undefined
  const source = queryParams.source as 'Website' | 'Google Ads' | 'Referral' | 'Social Media' | 'WhatsApp' | 'Career Page' | undefined
  const assigned_lawyer = queryParams.assigned_lawyer
  const search = queryParams.search

  // Build query conditions  
  const conditions: Array<ReturnType<typeof eq>> = []
  
  if (status) {
    conditions.push(eq(leads.status, status))
  }
  
  if (source) {
    conditions.push(eq(leads.source, source))
  }
  
  if (assigned_lawyer) {
    conditions.push(eq(leads.assigned_lawyer, assigned_lawyer))
  }
  
  if (search) {
    const searchCondition = or(
      sql`${leads.name} ILIKE ${`%${search}%`}`,
      sql`${leads.email} ILIKE ${`%${search}%`}`,
      sql`${leads.company} ILIKE ${`%${search}%`}`
    )
    if (searchCondition) {
      conditions.push(searchCondition)
    }
  }

  // Get total count for pagination
  const totalCountQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
  
  if (conditions.length > 0) {
    totalCountQuery.where(and(...conditions))
  }
  
  const [{ count: total }] = await totalCountQuery

  // Get paginated results
  const pagination = calculatePagination(page, limit, total)
  
  // Build query with proper typing
  const baseQuery = db
    .select()
    .from(leads)
  
  const filteredQuery = conditions.length > 0 
    ? baseQuery.where(and(...conditions))
    : baseQuery
  
  const leadsData = await filteredQuery
    .orderBy(sql`${leads.created_at} DESC`)
    .limit(limit)
    .offset(pagination.offset)

  return createPaginatedResponse(
    leadsData,
    {
      page,
      pageSize: limit,
      total,
      totalPages: pagination.totalPages
    },
    `Encontrados ${total} leads`
  )
})

