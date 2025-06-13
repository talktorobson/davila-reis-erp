// D'Avila Reis ERP - TypeScript Type Definitions
// Import auto-generated types from database schema
import type { 
  Lead as DrizzleLead, 
  Client as DrizzleClient, 
  Case as DrizzleCase, 
  FinancialRecord as DrizzleFinancialRecord,
  Document as DrizzleDocument,
  Task as DrizzleTask,
  Staff as DrizzleStaff 
} from '@/lib/schema'

// Use Drizzle-generated types to ensure database compatibility
export type Lead = DrizzleLead
export type Client = DrizzleClient  
export type Case = DrizzleCase
export type FinancialRecord = DrizzleFinancialRecord
export type Document = DrizzleDocument
export type Task = DrizzleTask
export type Staff = DrizzleStaff

// Import and export insert types as well
import type { 
  NewLead as DrizzleNewLead,
  NewClient as DrizzleNewClient,
  NewCase as DrizzleNewCase,
  NewFinancialRecord as DrizzleNewFinancialRecord,
  NewDocument as DrizzleNewDocument,
  NewTask as DrizzleNewTask,
  NewStaff as DrizzleNewStaff
} from '@/lib/schema'

export type NewLead = DrizzleNewLead
export type NewClient = DrizzleNewClient
export type NewCase = DrizzleNewCase
export type NewFinancialRecord = DrizzleNewFinancialRecord
export type NewDocument = DrizzleNewDocument
export type NewTask = DrizzleNewTask
export type NewStaff = DrizzleNewStaff

// Form interfaces
export interface LeadFormData {
  name: string
  email: string
  phone: string
  company?: string
  message?: string
  source: string
  utmCampaign?: string
}

export interface ContactFormData {
  name: string
  email: string
  phone: string
  company?: string
  message?: string
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Dashboard interfaces
export interface DashboardStats {
  totalLeads: number
  qualifiedLeads: number
  activeClients: number
  openCases: number
  monthlyRevenue: number
  outstandingReceivables: number
  conversionRate: number
  averageCaseValue: number
}

export interface LeadsBySource {
  source: string
  count: number
  percentage: number
}

export interface RevenueByMonth {
  month: string
  revenue: number
  target: number
}

export interface CasesByStatus {
  status: string
  count: number
  value: number
}

// Authentication interfaces
export interface User {
  id: string
  name: string
  email: string
  image?: string
  role: 'admin' | 'lawyer' | 'client'
  client_id?: string
  company?: string
  cnpj?: string
  portal_user_id?: string
}

// Notification interfaces
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
}

// Filter and search interfaces
export interface FilterOptions {
  status?: string[]
  priority?: string[]
  assignedTo?: string[]
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// Integration interfaces
export interface ClickSignDocument {
  key: string
  filename: string
  status: string
  signers: Array<{
    email: string
    name: string
    status: string
  }>
}

export interface SendGridTemplate {
  id: string
  name: string
  subject: string
  content: string
  variables: Record<string, string | number | boolean | null>
}

export interface ZapierWebhook {
  url: string
  event: string
  data: Record<string, string | number | boolean | null | object>
}