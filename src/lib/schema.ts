// D'Avila Reis ERP - PostgreSQL Database Schema using Drizzle ORM

import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  decimal, 
  integer,
  pgEnum,
  uuid,
  jsonb,
  index,
  unique,
  check
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Enums for status fields
export const leadStatusEnum = pgEnum('lead_status', [
  'Cold', 'Warm', 'Hot', 'Qualified', 'Lost', 'Converted'
])

export const clientStatusEnum = pgEnum('client_status', [
  'Active', 'Inactive', 'Suspended', 'Terminated'
])

export const caseStatusEnum = pgEnum('case_status', [
  'Open', 'In Progress', 'Waiting Client', 'Waiting Court', 
  'On Hold', 'Closed - Won', 'Closed - Lost', 'Cancelled'
])

export const priorityEnum = pgEnum('priority', [
  'Low', 'Medium', 'High', 'Urgent'
])

export const financialStatusEnum = pgEnum('financial_status', [
  'Pending', 'Paid', 'Overdue', 'Partial', 'Cancelled'
])

export const financialTypeEnum = pgEnum('financial_type', [
  'Income', 'Expense', 'Receivable', 'Payable', 'Invoice'
])

export const documentStatusEnum = pgEnum('document_status', [
  'Draft', 'Under Review', 'Approved', 'Signed', 'Expired', 'Archived'
])

export const taskStatusEnum = pgEnum('task_status', [
  'To Do', 'In Progress', 'Waiting', 'Done', 'Cancelled'
])

export const staffStatusEnum = pgEnum('staff_status', [
  'Active', 'Inactive', 'On Leave', 'Terminated'
])

export const regionEnum = pgEnum('region', [
  'Região 1 (015 Cerquilho)', 
  'Região 2 (019 Campinas)', 
  'Região 3 (011 SP Sul)', 
  'Região 4 (011 SP Oeste)', 
  'Região 5 (013 Litoral)'
])

export const sourceEnum = pgEnum('source', [
  'Website', 'Google Ads', 'Referral', 'Social Media', 'WhatsApp', 'Career Page'
])

// Client Portal specific enums
export const senderTypeEnum = pgEnum('sender_type', [
  'client', 'lawyer', 'staff'
])

export const recipientTypeEnum = pgEnum('recipient_type', [
  'client', 'lawyer', 'staff'
])

export const messageTypeEnum = pgEnum('message_type', [
  'message', 'notification', 'system'
])

export const accessActionEnum = pgEnum('access_action', [
  'view', 'download', 'preview'
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'info', 'success', 'warning', 'error', 'case_update', 'document', 'payment', 'message'
])

// LEADS table
export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  company: varchar('company', { length: 255 }),
  source: sourceEnum('source').notNull().default('Website'),
  status: leadStatusEnum('status').notNull().default('Cold'),
  initial_message: text('initial_message'),
  created_date: timestamp('created_date').defaultNow().notNull(),
  last_contact: timestamp('last_contact'),
  next_follow_up: timestamp('next_follow_up'),
  assigned_lawyer: uuid('assigned_lawyer').references(() => staff.id),
  lead_score: integer('lead_score').default(5),
  budget_range: varchar('budget_range', { length: 50 }),
  industry: varchar('industry', { length: 100 }),
  company_size: varchar('company_size', { length: 50 }),
  region: regionEnum('region'),
  service_interest: jsonb('service_interest').$type<string[]>().default([]),
  utm_campaign: varchar('utm_campaign', { length: 255 }),
  notes: text('notes'),
  conversion_probability: integer('conversion_probability'),
  converted_to_client_id: uuid('converted_to_client_id'),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  created_by: varchar('created_by', { length: 255 }).default('system')
}, (table) => ({
  emailIdx: index('leads_email_idx').on(table.email),
  phoneIdx: index('leads_phone_idx').on(table.phone),
  statusIdx: index('leads_status_idx').on(table.status),
  sourceIdx: index('leads_source_idx').on(table.source),
  assignedLawyerIdx: index('leads_assigned_lawyer_idx').on(table.assigned_lawyer),
  leadScoreCheck: check('lead_score_check', sql`${table.lead_score} >= 0 AND ${table.lead_score} <= 10`),
  conversionProbabilityCheck: check('conversion_probability_check', sql`${table.conversion_probability} >= 0 AND ${table.conversion_probability} <= 100`),
}))

// CLIENTS table
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_name: varchar('company_name', { length: 255 }).notNull(),
  cnpj: varchar('cnpj', { length: 18 }),
  contact_person: varchar('contact_person', { length: 255 }).notNull(),
  position: varchar('position', { length: 100 }),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  address: text('address'),
  region: regionEnum('region'),
  company_size: varchar('company_size', { length: 50 }),
  industry: varchar('industry', { length: 100 }),
  client_since: timestamp('client_since').defaultNow().notNull(),
  status: clientStatusEnum('status').notNull().default('Active'),
  primary_lawyer: uuid('primary_lawyer').references(() => staff.id),
  services_contracted: jsonb('services_contracted').$type<string[]>().default([]),
  total_contract_value: decimal('total_contract_value', { precision: 12, scale: 2 }),
  payment_terms: varchar('payment_terms', { length: 50 }).default('30 days'),
  documents_folder_url: varchar('documents_folder_url', { length: 1000 }),
  last_service_date: timestamp('last_service_date'),
  client_rating: integer('client_rating'),
  portal_access: boolean('portal_access').default(false),
  notes: text('notes'),
  linked_lead_id: uuid('linked_lead_id').references(() => leads.id),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  created_by: varchar('created_by', { length: 255 }).default('system')
}, (table) => ({
  cnpjUniqueIdx: unique('clients_cnpj_unique').on(table.cnpj),
  emailIdx: index('clients_email_idx').on(table.email),
  companyNameIdx: index('clients_company_name_idx').on(table.company_name),
  statusIdx: index('clients_status_idx').on(table.status),
  primaryLawyerIdx: index('clients_primary_lawyer_idx').on(table.primary_lawyer),
  regionIdx: index('clients_region_idx').on(table.region),
  clientRatingCheck: check('client_rating_check', sql`${table.client_rating} >= 1 AND ${table.client_rating} <= 5`),
}))

// CASES table
export const cases = pgTable('cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  case_number: varchar('case_number', { length: 100 }).notNull(),
  client_id: uuid('client_id').notNull(),
  case_title: varchar('case_title', { length: 255 }).notNull(),
  service_type: varchar('service_type', { length: 100 }).notNull(),
  description: text('description'),
  status: caseStatusEnum('status').notNull().default('Open'),
  priority: priorityEnum('priority').notNull().default('Medium'),
  assigned_lawyer: varchar('assigned_lawyer', { length: 255 }),
  supporting_staff: jsonb('supporting_staff').$type<string[]>().default([]),
  start_date: timestamp('start_date').defaultNow().notNull(),
  due_date: timestamp('due_date'),
  expected_close_date: timestamp('expected_close_date'),
  actual_close_date: timestamp('actual_close_date'),
  hours_budgeted: decimal('hours_budgeted', { precision: 8, scale: 2 }),
  hours_worked: decimal('hours_worked', { precision: 8, scale: 2 }),
  hourly_rate: decimal('hourly_rate', { precision: 8, scale: 2 }),
  fixed_fee: decimal('fixed_fee', { precision: 12, scale: 2 }),
  total_value: decimal('total_value', { precision: 12, scale: 2 }),
  progress_percentage: integer('progress_percentage').default(0),
  court_agency: varchar('court_agency', { length: 255 }),
  case_number_external: varchar('case_number_external', { length: 100 }),
  opposing_party: varchar('opposing_party', { length: 255 }),
  risk_level: priorityEnum('risk_level').default('Low'),
  key_dates: text('key_dates'),
  next_steps: text('next_steps'),
  outcome: text('outcome'),
  client_satisfaction: integer('client_satisfaction'),
  notes: text('notes'),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_by: varchar('created_by', { length: 255 }).default('system')
})

// FINANCIAL_RECORDS table
export const financialRecords = pgTable('financial_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: financialTypeEnum('type').notNull(),
  client_id: uuid('client_id'),
  case_id: uuid('case_id'),
  description: varchar('description', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  due_date: timestamp('due_date'),
  payment_date: timestamp('payment_date'),
  status: financialStatusEnum('status').notNull().default('Pending'),
  category: varchar('category', { length: 100 }),
  payment_method: varchar('payment_method', { length: 50 }),
  invoice_number: varchar('invoice_number', { length: 100 }),
  tax_rate: decimal('tax_rate', { precision: 5, scale: 4 }),
  tax_amount: decimal('tax_amount', { precision: 12, scale: 2 }),
  total_with_tax: decimal('total_with_tax', { precision: 12, scale: 2 }),
  days_overdue: integer('days_overdue').default(0),
  aging_bucket: varchar('aging_bucket', { length: 50 }),
  payment_link: varchar('payment_link', { length: 500 }),
  receipt: varchar('receipt', { length: 500 }),
  notes: text('notes'),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_by: varchar('created_by', { length: 255 }).default('system')
})

// DOCUMENTS table
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  client_id: uuid('client_id'),
  case_id: uuid('case_id'),
  document_name: varchar('document_name', { length: 255 }).notNull(),
  document_type: varchar('document_type', { length: 100 }).notNull(),
  file_url: varchar('file_url', { length: 500 }),
  file_size: integer('file_size'),
  access_level: varchar('access_level', { length: 50 }).notNull().default('Internal Only'),
  tags: jsonb('tags').$type<string[]>().default([]),
  version: decimal('version', { precision: 3, scale: 1 }).default('1.0'),
  status: documentStatusEnum('status').notNull().default('Draft'),
  expiry_date: timestamp('expiry_date'),
  last_modified: timestamp('last_modified'),
  clicksign_status: varchar('clicksign_status', { length: 50 }),
  signature_required: boolean('signature_required').default(false),
  digital_signature: varchar('digital_signature', { length: 500 }),
  notes: text('notes'),
  
  // Audit fields
  upload_date: timestamp('upload_date').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_by: varchar('created_by', { length: 255 }).default('system')
})

// TASKS table
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  client_id: uuid('client_id'),
  case_id: uuid('case_id'),
  assigned_to: varchar('assigned_to', { length: 255 }).notNull(),
  due_date: timestamp('due_date'),
  priority: priorityEnum('priority').notNull().default('Medium'),
  status: taskStatusEnum('status').notNull().default('To Do'),
  task_type: varchar('task_type', { length: 100 }),
  time_estimate: decimal('time_estimate', { precision: 6, scale: 2 }),
  time_spent: decimal('time_spent', { precision: 6, scale: 2 }),
  progress_percentage: integer('progress_percentage').default(0),
  dependencies: jsonb('dependencies').$type<string[]>().default([]),
  deadline_critical: boolean('deadline_critical').default(false),
  billable: boolean('billable').default(false),
  hourly_rate: decimal('hourly_rate', { precision: 8, scale: 2 }),
  completed_date: timestamp('completed_date'),
  notes: text('notes'),
  next_action: varchar('next_action', { length: 255 }),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_by: varchar('created_by', { length: 255 }).default('system')
})

// STAFF table
export const staff = pgTable('staff', {
  id: uuid('id').defaultRandom().primaryKey(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  position: varchar('position', { length: 100 }).notNull(),
  oab_number: varchar('oab_number', { length: 50 }),
  specialization: jsonb('specialization').$type<string[]>().default([]),
  primary_region: regionEnum('primary_region'),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date'),
  status: staffStatusEnum('status').notNull().default('Active'),
  hourly_rate: decimal('hourly_rate', { precision: 8, scale: 2 }),
  monthly_salary: decimal('monthly_salary', { precision: 12, scale: 2 }),
  target_hours: decimal('target_hours', { precision: 6, scale: 2 }),
  workload_percentage: integer('workload_percentage'),
  performance_rating: integer('performance_rating'),
  bio: text('bio'),
  photo: varchar('photo', { length: 500 }),
  skills: jsonb('skills').$type<string[]>().default([]),
  languages: jsonb('languages').$type<string[]>().default([]),
  notes: text('notes'),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_by: varchar('created_by', { length: 255 }).default('system')
})

// CLIENT PORTAL USERS table
export const clientPortalUsers = pgTable('client_portal_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  client_id: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  cnpj: varchar('cnpj', { length: 18 }),
  last_login: timestamp('last_login'),
  failed_login_attempts: integer('failed_login_attempts').default(0),
  locked_until: timestamp('locked_until'),
  portal_access_enabled: boolean('portal_access_enabled').default(true),
  email_verified: boolean('email_verified').default(false),
  email_verification_token: varchar('email_verification_token', { length: 255 }),
  password_reset_token: varchar('password_reset_token', { length: 255 }),
  password_reset_expires: timestamp('password_reset_expires'),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
})

// CLIENT COMMUNICATIONS table
export const clientCommunications = pgTable('client_communications', {
  id: uuid('id').defaultRandom().primaryKey(),
  client_id: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  case_id: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  sender_type: senderTypeEnum('sender_type').notNull(),
  sender_id: uuid('sender_id').notNull(),
  recipient_type: recipientTypeEnum('recipient_type').notNull(),
  recipient_id: uuid('recipient_id').notNull(),
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  attachments: jsonb('attachments').$type<string[]>().default([]),
  read_by_recipient: boolean('read_by_recipient').default(false),
  read_at: timestamp('read_at'),
  priority: priorityEnum('priority').default('Medium'),
  message_type: messageTypeEnum('message_type').default('message'),
  parent_message_id: uuid('parent_message_id'),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow()
})

// DOCUMENT ACCESS LOGS table
export const documentAccessLogs = pgTable('document_access_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  document_id: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  client_id: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => clientPortalUsers.id, { onDelete: 'set null' }),
  action: accessActionEnum('action').notNull(),
  ip_address: varchar('ip_address', { length: 45 }), // Support both IPv4 and IPv6
  user_agent: text('user_agent'),
  success: boolean('success').default(true),
  error_message: text('error_message'),
  
  // Audit fields
  accessed_at: timestamp('accessed_at').defaultNow()
})

// CLIENT PORTAL SESSIONS table
export const clientPortalSessions = pgTable('client_portal_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => clientPortalUsers.id, { onDelete: 'cascade' }),
  session_token: varchar('session_token', { length: 255 }).notNull().unique(),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  expires_at: timestamp('expires_at').notNull(),
  last_activity: timestamp('last_activity').defaultNow(),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow()
})

// CLIENT NOTIFICATIONS table
export const clientNotifications = pgTable('client_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  client_id: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull(),
  read: boolean('read').default(false),
  read_at: timestamp('read_at'),
  action_url: varchar('action_url', { length: 500 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  expires_at: timestamp('expires_at'),
  
  // Audit fields
  created_at: timestamp('created_at').defaultNow()
})

// Relations
export const leadsRelations = relations(leads, ({ one }) => ({
  convertedClient: one(clients, {
    fields: [leads.converted_to_client_id],
    references: [clients.id]
  })
}))

export const clientsRelations = relations(clients, ({ many, one }) => ({
  cases: many(cases),
  financialRecords: many(financialRecords),
  documents: many(documents),
  tasks: many(tasks),
  portalUsers: many(clientPortalUsers),
  communications: many(clientCommunications),
  notifications: many(clientNotifications),
  documentAccessLogs: many(documentAccessLogs),
  linkedLead: one(leads, {
    fields: [clients.linked_lead_id],
    references: [leads.id]
  })
}))

export const casesRelations = relations(cases, ({ one, many }) => ({
  client: one(clients, {
    fields: [cases.client_id],
    references: [clients.id]
  }),
  financialRecords: many(financialRecords),
  documents: many(documents),
  tasks: many(tasks)
}))

export const financialRecordsRelations = relations(financialRecords, ({ one }) => ({
  client: one(clients, {
    fields: [financialRecords.client_id],
    references: [clients.id]
  }),
  case: one(cases, {
    fields: [financialRecords.case_id],
    references: [cases.id]
  })
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.client_id],
    references: [clients.id]
  }),
  case: one(cases, {
    fields: [documents.case_id],
    references: [cases.id]
  })
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  client: one(clients, {
    fields: [tasks.client_id],
    references: [clients.id]
  }),
  case: one(cases, {
    fields: [tasks.case_id],
    references: [cases.id]
  })
}))

// Client Portal Relations
export const clientPortalUsersRelations = relations(clientPortalUsers, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientPortalUsers.client_id],
    references: [clients.id]
  }),
  sessions: many(clientPortalSessions),
  accessLogs: many(documentAccessLogs)
}))

export const clientCommunicationsRelations = relations(clientCommunications, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientCommunications.client_id],
    references: [clients.id]
  }),
  case: one(cases, {
    fields: [clientCommunications.case_id],
    references: [cases.id]
  }),
  parentMessage: one(clientCommunications, {
    fields: [clientCommunications.parent_message_id],
    references: [clientCommunications.id]
  }),
  replies: many(clientCommunications)
}))

export const documentAccessLogsRelations = relations(documentAccessLogs, ({ one }) => ({
  document: one(documents, {
    fields: [documentAccessLogs.document_id],
    references: [documents.id]
  }),
  client: one(clients, {
    fields: [documentAccessLogs.client_id],
    references: [clients.id]
  }),
  user: one(clientPortalUsers, {
    fields: [documentAccessLogs.user_id],
    references: [clientPortalUsers.id]
  })
}))

export const clientPortalSessionsRelations = relations(clientPortalSessions, ({ one }) => ({
  user: one(clientPortalUsers, {
    fields: [clientPortalSessions.user_id],
    references: [clientPortalUsers.id]
  })
}))

export const clientNotificationsRelations = relations(clientNotifications, ({ one }) => ({
  client: one(clients, {
    fields: [clientNotifications.client_id],
    references: [clients.id]
  })
}))

// Export types for TypeScript
export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type Case = typeof cases.$inferSelect
export type NewCase = typeof cases.$inferInsert
export type FinancialRecord = typeof financialRecords.$inferSelect
export type NewFinancialRecord = typeof financialRecords.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type Staff = typeof staff.$inferSelect
export type NewStaff = typeof staff.$inferInsert

// Client Portal Types
export type ClientPortalUser = typeof clientPortalUsers.$inferSelect
export type NewClientPortalUser = typeof clientPortalUsers.$inferInsert
export type ClientCommunication = typeof clientCommunications.$inferSelect
export type NewClientCommunication = typeof clientCommunications.$inferInsert
export type DocumentAccessLog = typeof documentAccessLogs.$inferSelect
export type NewDocumentAccessLog = typeof documentAccessLogs.$inferInsert
export type ClientPortalSession = typeof clientPortalSessions.$inferSelect
export type NewClientPortalSession = typeof clientPortalSessions.$inferInsert
export type ClientNotification = typeof clientNotifications.$inferSelect
export type NewClientNotification = typeof clientNotifications.$inferInsert