CREATE TYPE "public"."case_status" AS ENUM('Open', 'In Progress', 'Waiting Client', 'Waiting Court', 'On Hold', 'Closed - Won', 'Closed - Lost', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('Active', 'Inactive', 'Suspended', 'Terminated');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('Draft', 'Under Review', 'Approved', 'Signed', 'Expired', 'Archived');--> statement-breakpoint
CREATE TYPE "public"."financial_status" AS ENUM('Pending', 'Paid', 'Overdue', 'Partial', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."financial_type" AS ENUM('Income', 'Expense', 'Receivable', 'Payable', 'Invoice');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('Cold', 'Warm', 'Hot', 'Qualified', 'Lost', 'Converted');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('Low', 'Medium', 'High', 'Urgent');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('Região 1 (015 Cerquilho)', 'Região 2 (019 Campinas)', 'Região 3 (011 SP Sul)', 'Região 4 (011 SP Oeste)', 'Região 5 (013 Litoral)');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('Active', 'Inactive', 'On Leave', 'Terminated');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('To Do', 'In Progress', 'Waiting', 'Done', 'Cancelled');--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_number" varchar(100) NOT NULL,
	"client_id" uuid NOT NULL,
	"case_title" varchar(255) NOT NULL,
	"service_type" varchar(100) NOT NULL,
	"description" text,
	"status" "case_status" DEFAULT 'Open' NOT NULL,
	"priority" "priority" DEFAULT 'Medium' NOT NULL,
	"assigned_lawyer" varchar(255),
	"supporting_staff" jsonb DEFAULT '[]'::jsonb,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"expected_close_date" timestamp,
	"actual_close_date" timestamp,
	"hours_budgeted" numeric(8, 2),
	"hours_worked" numeric(8, 2),
	"hourly_rate" numeric(8, 2),
	"fixed_fee" numeric(12, 2),
	"total_value" numeric(12, 2),
	"progress_percentage" integer DEFAULT 0,
	"court_agency" varchar(255),
	"case_number_external" varchar(100),
	"opposing_party" varchar(255),
	"risk_level" "priority" DEFAULT 'Low',
	"key_dates" text,
	"next_steps" text,
	"outcome" text,
	"client_satisfaction" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255) DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"cnpj" varchar(18),
	"contact_person" varchar(255) NOT NULL,
	"position" varchar(100),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"address" text,
	"region" "region",
	"company_size" varchar(50),
	"industry" varchar(100),
	"client_since" timestamp DEFAULT now() NOT NULL,
	"status" "client_status" DEFAULT 'Active' NOT NULL,
	"primary_lawyer" varchar(255),
	"services_contracted" jsonb DEFAULT '[]'::jsonb,
	"total_contract_value" numeric(12, 2),
	"payment_terms" varchar(50) DEFAULT '30 days',
	"documents_folder_url" varchar(500),
	"last_service_date" timestamp,
	"client_rating" integer,
	"portal_access" boolean DEFAULT false,
	"notes" text,
	"linked_lead_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255) DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"case_id" uuid,
	"document_name" varchar(255) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"file_url" varchar(500),
	"file_size" integer,
	"access_level" varchar(50) DEFAULT 'Internal Only' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"version" numeric(3, 1) DEFAULT '1.0',
	"status" "document_status" DEFAULT 'Draft' NOT NULL,
	"expiry_date" timestamp,
	"last_modified" timestamp,
	"clicksign_status" varchar(50),
	"signature_required" boolean DEFAULT false,
	"digital_signature" varchar(500),
	"notes" text,
	"upload_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255) DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "financial_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "financial_type" NOT NULL,
	"client_id" uuid,
	"case_id" uuid,
	"description" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"due_date" timestamp,
	"payment_date" timestamp,
	"status" "financial_status" DEFAULT 'Pending' NOT NULL,
	"category" varchar(100),
	"payment_method" varchar(50),
	"invoice_number" varchar(100),
	"tax_rate" numeric(5, 4),
	"tax_amount" numeric(12, 2),
	"total_with_tax" numeric(12, 2),
	"days_overdue" integer DEFAULT 0,
	"aging_bucket" varchar(50),
	"payment_link" varchar(500),
	"receipt" varchar(500),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255) DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"company" varchar(255),
	"source" varchar(100) DEFAULT 'Website' NOT NULL,
	"status" "lead_status" DEFAULT 'Cold' NOT NULL,
	"initial_message" text,
	"created_date" timestamp DEFAULT now() NOT NULL,
	"last_contact" timestamp,
	"next_follow_up" timestamp,
	"assigned_lawyer" varchar(255),
	"lead_score" integer DEFAULT 5,
	"budget_range" varchar(50),
	"industry" varchar(100),
	"company_size" varchar(50),
	"region" "region",
	"service_interest" jsonb DEFAULT '[]'::jsonb,
	"utm_campaign" varchar(255),
	"notes" text,
	"conversion_probability" integer,
	"converted_to_client_id" uuid,
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255) DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"position" varchar(100) NOT NULL,
	"oab_number" varchar(50),
	"specialization" jsonb DEFAULT '[]'::jsonb,
	"primary_region" "region",
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" "staff_status" DEFAULT 'Active' NOT NULL,
	"hourly_rate" numeric(8, 2),
	"monthly_salary" numeric(12, 2),
	"target_hours" numeric(6, 2),
	"workload_percentage" integer,
	"performance_rating" integer,
	"bio" text,
	"photo" varchar(500),
	"skills" jsonb DEFAULT '[]'::jsonb,
	"languages" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255) DEFAULT 'system',
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"client_id" uuid,
	"case_id" uuid,
	"assigned_to" varchar(255) NOT NULL,
	"due_date" timestamp,
	"priority" "priority" DEFAULT 'Medium' NOT NULL,
	"status" "task_status" DEFAULT 'To Do' NOT NULL,
	"task_type" varchar(100),
	"time_estimate" numeric(6, 2),
	"time_spent" numeric(6, 2),
	"progress_percentage" integer DEFAULT 0,
	"dependencies" jsonb DEFAULT '[]'::jsonb,
	"deadline_critical" boolean DEFAULT false,
	"billable" boolean DEFAULT false,
	"hourly_rate" numeric(8, 2),
	"completed_date" timestamp,
	"notes" text,
	"next_action" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255) DEFAULT 'system'
);
