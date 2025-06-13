// D'Avila Reis ERP - PostgreSQL Database Services

import { eq, desc, and, or, count, sql, gte, lte, like } from 'drizzle-orm'
import { db, dbReader } from './database'
import { 
  leads, 
  clients, 
  cases, 
  financialRecords, 
  documents, 
  tasks, 
  staff,
  type Lead,
  type NewLead,
  type Client,
  type NewClient,
  type Case,
  type NewCase,
  type FinancialRecord,
  type NewFinancialRecord,
  type Document,
  type NewDocument,
  type Task,
  type NewTask,
  type Staff,
  type NewStaff
} from './schema'
import type { ApiResponse } from '@/types'

// Generic database service class
export class DatabaseService<TSelect, TInsert> {
  constructor(
    private table: any,
    private table_name: string
  ) {}

  async get_all(options?: {
    limit?: number
    offset?: number
    order_by?: 'asc' | 'desc'
    order_field?: string
  }): Promise<TSelect[]> {
    try {
      let query: any = dbReader.select().from(this.table)
      
      if (options?.order_by && options?.order_field) {
        const order_direction = options.order_by === 'desc' ? desc : undefined
        query = order_direction 
          ? query.orderBy(order_direction(this.table[options.order_field]))
          : query.orderBy(this.table[options.order_field])
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      if (options?.offset) {
        query = query.offset(options.offset)
      }
      
      return await query
    } catch (error) {
      console.error(`Error fetching records from ${this.table_name}:`, error)
      throw error
    }
  }

  async get_by_id(id: string): Promise<TSelect | null> {
    try {
      const result = await dbReader
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1)
      
      return result[0] || null
    } catch (error) {
      console.error(`Error fetching record ${id} from ${this.table_name}:`, error)
      return null
    }
  }

  async create(data: TInsert): Promise<TSelect> {
    try {
      const result = await db
        .insert(this.table)
        .values(data as any)
        .returning()
      
      return (result as any)[0]
    } catch (error) {
      console.error(`Error creating record in ${this.table_name}:`, error)
      throw error
    }
  }

  async update(id: string, data: Partial<TInsert>): Promise<TSelect> {
    try {
      const result = await db
        .update(this.table)
        .set({ ...data, updated_at: new Date() } as any)
        .where(eq(this.table.id, id))
        .returning()
      
      return (result as any)[0]
    } catch (error) {
      console.error(`Error updating record ${id} in ${this.table_name}:`, error)
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await db
        .delete(this.table)
        .where(eq(this.table.id, id))
      
      return true
    } catch (error) {
      console.error(`Error deleting record ${id} from ${this.table_name}:`, error)
      return false
    }
  }

  async count(): Promise<number> {
    try {
      const result = await dbReader
        .select({ count: count() })
        .from(this.table)
      
      return result[0].count
    } catch (error) {
      console.error(`Error counting records in ${this.table_name}:`, error)
      return 0
    }
  }
}

// Specific service instances
export const leads_service = new DatabaseService<Lead, NewLead>(leads, 'leads')
export const clients_service = new DatabaseService<Client, NewClient>(clients, 'clients')
export const cases_service = new DatabaseService<Case, NewCase>(cases, 'cases')
export const financial_service = new DatabaseService<FinancialRecord, NewFinancialRecord>(financialRecords, 'financial_records')
export const documents_service = new DatabaseService<Document, NewDocument>(documents, 'documents')
export const tasks_service = new DatabaseService<Task, NewTask>(tasks, 'tasks')
export const staff_service = new DatabaseService<Staff, NewStaff>(staff, 'staff')

// Specialized methods for business logic
export class LeadsAPI {
  static async create_lead(lead_data: Partial<NewLead>): Promise<ApiResponse<Lead>> {
    try {
      const lead = await leads_service.create({
        ...lead_data,
        created_date: new Date(),
        status: 'Cold',
        lead_score: 5,
        source: lead_data.source || 'Website'
      } as NewLead)

      return {
        success: true,
        data: lead,
        message: 'Lead created successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create lead'
      }
    }
  }

  static async get_leads_by_status(status: string): Promise<Lead[]> {
    try {
      return await dbReader
        .select()
        .from(leads)
        .where(eq(leads.status, status as any))
        .orderBy(desc(leads.created_date))
    } catch (error) {
      console.error('Error fetching leads by status:', error)
      return []
    }
  }

  static async get_leads_by_assigned_lawyer(lawyer: string): Promise<Lead[]> {
    try {
      return await dbReader
        .select()
        .from(leads)
        .where(eq(leads.assigned_lawyer, lawyer))
        .orderBy(desc(leads.created_date))
    } catch (error) {
      console.error('Error fetching leads by lawyer:', error)
      return []
    }
  }

  static async update_lead_status(id: string, status: string): Promise<ApiResponse<Lead>> {
    try {
      const lead = await leads_service.update(id, { status: status as any })
      return {
        success: true,
        data: lead,
        message: 'Lead status updated'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update lead status'
      }
    }
  }

  static async convert_lead_to_client(lead_id: string, client_data: Partial<NewClient>): Promise<ApiResponse<Client>> {
    try {
      // Create client record
      const client = await clients_service.create({
        ...client_data,
        client_since: new Date(),
        status: 'Active',
        portal_access: false,
        linked_lead_id: lead_id
      } as NewClient)

      // Update lead status to converted
      await leads_service.update(lead_id, { 
        status: 'Converted',
        converted_to_client_id: client.id
      })

      return {
        success: true,
        data: client,
        message: 'Lead converted to client successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to convert lead to client'
      }
    }
  }

  static async search_leads(search_term: string): Promise<Lead[]> {
    try {
      return await dbReader
        .select()
        .from(leads)
        .where(
          or(
            like(leads.name, `%${search_term}%`),
            like(leads.email, `%${search_term}%`),
            like(leads.company, `%${search_term}%`)
          )
        )
        .orderBy(desc(leads.created_date))
    } catch (error) {
      console.error('Error searching leads:', error)
      return []
    }
  }
}

export class ClientsAPI {
  static async get_active_clients(): Promise<Client[]> {
    try {
      return await dbReader
        .select()
        .from(clients)
        .where(eq(clients.status, 'Active'))
        .orderBy(desc(clients.client_since))
    } catch (error) {
      console.error('Error fetching active clients:', error)
      return []
    }
  }

  static async get_clients_by_lawyer(lawyer: string): Promise<Client[]> {
    try {
      return await dbReader
        .select()
        .from(clients)
        .where(eq(clients.primary_lawyer, lawyer))
        .orderBy(desc(clients.client_since))
    } catch (error) {
      console.error('Error fetching clients by lawyer:', error)
      return []
    }
  }

  static async get_client_cases(client_id: string): Promise<Case[]> {
    try {
      return await dbReader
        .select()
        .from(cases)
        .where(eq(cases.client_id, client_id))
        .orderBy(desc(cases.start_date))
    } catch (error) {
      console.error('Error fetching client cases:', error)
      return []
    }
  }

  static async get_client_invoices(client_id: string): Promise<FinancialRecord[]> {
    try {
      return await dbReader
        .select()
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.client_id, client_id),
            eq(financialRecords.type, 'Invoice')
          )
        )
        .orderBy(desc(financialRecords.created_at))
    } catch (error) {
      console.error('Error fetching client invoices:', error)
      return []
    }
  }

  static async search_clients(search_term: string): Promise<Client[]> {
    try {
      return await dbReader
        .select()
        .from(clients)
        .where(
          or(
            like(clients.company_name, `%${search_term}%`),
            like(clients.contact_person, `%${search_term}%`),
            like(clients.email, `%${search_term}%`),
            like(clients.cnpj, `%${search_term}%`)
          )
        )
        .orderBy(desc(clients.client_since))
    } catch (error) {
      console.error('Error searching clients:', error)
      return []
    }
  }
}

export class CasesAPI {
  static async create_case(case_data: Partial<NewCase>): Promise<ApiResponse<Case>> {
    try {
      // Generate case number
      const case_count = await cases_service.count()
      const case_number = `CASE-${new Date().getFullYear()}-${String(case_count + 1).padStart(4, '0')}`

      const case_ = await cases_service.create({
        ...case_data,
        case_number,
        start_date: new Date(),
        status: 'Open',
        progress_percentage: 0
      } as NewCase)

      return {
        success: true,
        data: case_,
        message: 'Case created successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create case'
      }
    }
  }

  static async get_open_cases(): Promise<Case[]> {
    try {
      return await dbReader
        .select()
        .from(cases)
        .where(
          and(
            sql`${cases.status} NOT IN ('Closed - Won', 'Closed - Lost', 'Cancelled')`
          )
        )
        .orderBy(desc(cases.start_date))
    } catch (error) {
      console.error('Error fetching open cases:', error)
      return []
    }
  }

  static async get_cases_by_lawyer(lawyer: string): Promise<Case[]> {
    try {
      return await dbReader
        .select()
        .from(cases)
        .where(eq(cases.assigned_lawyer, lawyer))
        .orderBy(desc(cases.start_date))
    } catch (error) {
      console.error('Error fetching cases by lawyer:', error)
      return []
    }
  }

  static async update_case_progress(id: string, progress: number): Promise<ApiResponse<Case>> {
    try {
      const update_data: any = { 
        progress_percentage: progress
      }
      
      if (progress === 100) {
        update_data.actual_close_date = new Date()
        update_data.status = 'Closed - Won'
      }

      const case_ = await cases_service.update(id, update_data)

      return {
        success: true,
        data: case_,
        message: 'Case progress updated'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update case progress'
      }
    }
  }

  static async get_cases_by_status(status: string): Promise<Case[]> {
    try {
      return await dbReader
        .select()
        .from(cases)
        .where(eq(cases.status, status as any))
        .orderBy(desc(cases.start_date))
    } catch (error) {
      console.error('Error fetching cases by status:', error)
      return []
    }
  }
}

export class FinancialAPI {
  static async create_invoice(invoice_data: Partial<NewFinancialRecord>): Promise<ApiResponse<FinancialRecord>> {
    try {
      // Generate invoice number
      const invoice_count = await dbReader
        .select({ count: count() })
        .from(financialRecords)
        .where(eq(financialRecords.type, 'Invoice'))
      
      const invoice_number = `INV-${new Date().getFullYear()}-${String(invoice_count[0].count + 1).padStart(4, '0')}`

      const invoice = await financial_service.create({
        ...invoice_data,
        type: 'Invoice',
        status: 'Pending',
        invoice_number
      } as NewFinancialRecord)

      return {
        success: true,
        data: invoice,
        message: 'Invoice created successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create invoice'
      }
    }
  }

  static async get_unpaid_invoices(): Promise<FinancialRecord[]> {
    try {
      return await dbReader
        .select()
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'Invoice'),
            sql`${financialRecords.status} != 'Paid'`
          )
        )
        .orderBy(desc(financialRecords.due_date))
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error)
      return []
    }
  }

  static async get_overdue_invoices(): Promise<FinancialRecord[]> {
    try {
      const today = new Date()
      return await dbReader
        .select()
        .from(financialRecords)
        .where(
          and(
            eq(financialRecords.type, 'Invoice'),
            eq(financialRecords.status, 'Overdue'),
            lte(financialRecords.due_date, today)
          )
        )
        .orderBy(desc(financialRecords.days_overdue))
    } catch (error) {
      console.error('Error fetching overdue invoices:', error)
      return []
    }
  }

  static async mark_invoice_paid(id: string, payment_date?: Date): Promise<ApiResponse<FinancialRecord>> {
    try {
      const invoice = await financial_service.update(id, {
        status: 'Paid',
        payment_date: payment_date || new Date()
      })

      return {
        success: true,
        data: invoice,
        message: 'Invoice marked as paid'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update invoice status'
      }
    }
  }

  static async get_financial_summary(): Promise<{
    total_revenue: number
    total_expenses: number
    outstanding_receivables: number
    overdue_amount: number
  }> {
    try {
      // This would be implemented with more complex aggregation queries
      // For now, returning mock data structure
      return {
        total_revenue: 0,
        total_expenses: 0,
        outstanding_receivables: 0,
        overdue_amount: 0
      }
    } catch (error) {
      console.error('Error fetching financial summary:', error)
      return {
        total_revenue: 0,
        total_expenses: 0,
        outstanding_receivables: 0,
        overdue_amount: 0
      }
    }
  }
}

export class DocumentsAPI {
  static async upload_document(document_data: Partial<NewDocument>): Promise<ApiResponse<Document>> {
    try {
      const document = await documents_service.create({
        ...document_data,
        upload_date: new Date(),
        status: 'Draft',
        signature_required: false,
        version: '1.0'
      } as NewDocument)

      return {
        success: true,
        data: document,
        message: 'Document uploaded successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to upload document'
      }
    }
  }

  static async get_client_documents(client_id: string): Promise<Document[]> {
    try {
      return await dbReader
        .select()
        .from(documents)
        .where(eq(documents.client_id, client_id))
        .orderBy(desc(documents.upload_date))
    } catch (error) {
      console.error('Error fetching client documents:', error)
      return []
    }
  }

  static async get_case_documents(case_id: string): Promise<Document[]> {
    try {
      return await dbReader
        .select()
        .from(documents)
        .where(eq(documents.case_id, case_id))
        .orderBy(desc(documents.upload_date))
    } catch (error) {
      console.error('Error fetching case documents:', error)
      return []
    }
  }
}

export class TasksAPI {
  static async create_task(task_data: Partial<NewTask>): Promise<ApiResponse<Task>> {
    try {
      const task = await tasks_service.create({
        ...task_data,
        status: 'To Do',
        progress_percentage: 0,
        deadline_critical: false,
        billable: false
      } as NewTask)

      return {
        success: true,
        data: task,
        message: 'Task created successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create task'
      }
    }
  }

  static async get_tasks_by_assignee(assigned_to: string): Promise<Task[]> {
    try {
      return await dbReader
        .select()
        .from(tasks)
        .where(eq(tasks.assigned_to, assigned_to))
        .orderBy(desc(tasks.due_date))
    } catch (error) {
      console.error('Error fetching tasks by assignee:', error)
      return []
    }
  }

  static async get_overdue_tasks(): Promise<Task[]> {
    try {
      const today = new Date()
      return await dbReader
        .select()
        .from(tasks)
        .where(
          and(
            lte(tasks.due_date, today),
            sql`${tasks.status} != 'Done'`
          )
        )
        .orderBy(desc(tasks.due_date))
    } catch (error) {
      console.error('Error fetching overdue tasks:', error)
      return []
    }
  }

  static async complete_task(id: string): Promise<ApiResponse<Task>> {
    try {
      const task = await tasks_service.update(id, {
        status: 'Done',
        progress_percentage: 100,
        completed_date: new Date()
      })

      return {
        success: true,
        data: task,
        message: 'Task completed'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to complete task'
      }
    }
  }
}

// Export all services - classes are already exported above individually