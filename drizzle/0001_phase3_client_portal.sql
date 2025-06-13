-- Phase 3: Client Portal Database Schema
-- D'Avila Reis Law Firm ERP/CRM System
-- This migration adds tables needed for Phase 3 client portal functionality

-- ======================================
-- Create ENUMs for Phase 3
-- ======================================
DO $$ 
BEGIN
    -- Create sender_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sender_type') THEN
        CREATE TYPE sender_type AS ENUM ('client', 'lawyer', 'staff');
    END IF;
    
    -- Create recipient_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipient_type') THEN
        CREATE TYPE recipient_type AS ENUM ('client', 'lawyer', 'staff');
    END IF;
    
    -- Create message_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
        CREATE TYPE message_type AS ENUM ('message', 'notification', 'system');
    END IF;
    
    -- Create access_action enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_action') THEN
        CREATE TYPE access_action AS ENUM ('view', 'download', 'preview');
    END IF;
    
    -- Create notification_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'case_update', 'document', 'payment', 'message');
    END IF;
END$$;

-- ======================================
-- 1. Portal Sessions Management
-- ======================================
CREATE TABLE IF NOT EXISTS portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_token ON portal_sessions(session_token);
CREATE INDEX idx_client_activity ON portal_sessions(client_id, last_activity);
CREATE INDEX idx_expires ON portal_sessions(expires_at);

-- ======================================
-- 2. Portal Messages (Client-Lawyer Communication)
-- ======================================
CREATE TABLE IF NOT EXISTS portal_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL,
    sender_type sender_type NOT NULL, -- 'client', 'lawyer', 'staff'
    sender_id UUID NOT NULL,
    recipient_type recipient_type NOT NULL, -- 'client', 'lawyer', 'staff'
    recipient_id UUID NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_thread ON portal_messages(thread_id);
CREATE INDEX idx_sender ON portal_messages(sender_type, sender_id);
CREATE INDEX idx_recipient ON portal_messages(recipient_type, recipient_id);
CREATE INDEX idx_case_messages ON portal_messages(case_id);
CREATE INDEX idx_unread ON portal_messages(recipient_id, is_read) WHERE is_read = FALSE;

-- ======================================
-- 3. Document Access Logs
-- ======================================
CREATE TABLE IF NOT EXISTS document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    action access_action NOT NULL, -- 'view', 'download', 'preview'
    ip_address INET,
    user_agent TEXT,
    access_timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_access ON document_access_logs(document_id, access_timestamp);
CREATE INDEX idx_client_access ON document_access_logs(client_id, access_timestamp);

-- ======================================
-- 4. Portal Notifications
-- ======================================
CREATE TABLE IF NOT EXISTS portal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type notification_type NOT NULL, -- 'info', 'success', 'warning', 'error', 'case_update', 'document', 'payment', 'message'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_notifications ON portal_notifications(client_id, is_read, created_at);
CREATE INDEX idx_unread_notifications ON portal_notifications(client_id) WHERE is_read = FALSE;
CREATE INDEX idx_expires_notifications ON portal_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ======================================
-- 5. Client Activity Logs
-- ======================================
CREATE TABLE IF NOT EXISTS client_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_activity_type ON client_activity_logs(client_id, activity_type, created_at);
CREATE INDEX idx_activity_timestamp ON client_activity_logs(created_at);

-- ======================================
-- 6. Portal Settings
-- ======================================
CREATE TABLE IF NOT EXISTS portal_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    whatsapp_notifications BOOLEAN DEFAULT FALSE,
    language VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(client_id)
);

-- ======================================
-- 7. Case Updates for Portal
-- ======================================
CREATE TABLE IF NOT EXISTS case_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    update_type VARCHAR(50) NOT NULL, -- 'status_change', 'hearing_scheduled', 'document_added', 'deadline_approaching'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) DEFAULT 'client', -- 'internal', 'client'
    created_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_updates ON case_updates(case_id, created_at);
CREATE INDEX idx_visible_updates ON case_updates(case_id, visibility);

-- ======================================
-- 8. Portal FAQs
-- ======================================
CREATE TABLE IF NOT EXISTS portal_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_faq_category ON portal_faqs(category, order_position);

-- ======================================
-- Views for Portal Dashboard
-- ======================================

-- Client Dashboard Summary View
CREATE OR REPLACE VIEW client_dashboard_summary AS
SELECT 
    c.id as client_id,
    c.company_name,
    c.contact_person,
    COUNT(DISTINCT ca.id) as total_cases,
    COUNT(DISTINCT ca.id) FILTER (WHERE ca.status IN ('Open', 'In Progress')) as active_cases,
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT pn.id) FILTER (WHERE pn.is_read = FALSE) as unread_notifications,
    COUNT(DISTINCT pm.id) FILTER (WHERE pm.is_read = FALSE AND pm.recipient_id = c.id) as unread_messages,
    COALESCE(SUM(fr.amount) FILTER (WHERE fr.status = 'Pending'), 0) as pending_amount
FROM clients c
LEFT JOIN cases ca ON c.id = ca.client_id
LEFT JOIN documents d ON ca.id = d.case_id
LEFT JOIN portal_notifications pn ON c.id = pn.client_id
LEFT JOIN portal_messages pm ON c.id = pm.recipient_id AND pm.recipient_type = 'client'
LEFT JOIN financial_records fr ON c.id = fr.client_id
GROUP BY c.id, c.company_name, c.contact_person;

-- ======================================
-- Indexes for Performance
-- ======================================
CREATE INDEX IF NOT EXISTS idx_portal_performance_1 ON portal_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_performance_2 ON portal_notifications(client_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_portal_performance_3 ON document_access_logs(document_id, access_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_portal_performance_4 ON case_updates(case_id, created_at DESC) WHERE visibility = 'client';

-- ======================================
-- Functions and Triggers
-- ======================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS void AS $$
BEGIN
    DELETE FROM portal_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create notification on case update
CREATE OR REPLACE FUNCTION notify_client_on_case_update() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visibility = 'client' THEN
        INSERT INTO portal_notifications (
            client_id,
            type,
            title,
            message,
            action_url,
            metadata
        )
        SELECT 
            c.client_id,
            'case_update'::notification_type,
            NEW.title,
            NEW.description,
            '/portal/cases/' || NEW.case_id,
            jsonb_build_object(
                'case_id', NEW.case_id,
                'update_type', NEW.update_type,
                'update_id', NEW.id
            )
        FROM cases c
        WHERE c.id = NEW.case_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_client_on_case_update
    AFTER INSERT ON case_updates
    FOR EACH ROW
    EXECUTE FUNCTION notify_client_on_case_update();

-- ======================================
-- Initial Data
-- ======================================

-- Insert default FAQs
INSERT INTO portal_faqs (category, question, answer, order_position) VALUES
('Geral', 'Como faço para acessar meus documentos?', 'Acesse a seção "Documentos" no menu principal do portal. Lá você encontrará todos os documentos relacionados aos seus casos organizados por data.', 1),
('Geral', 'Como entro em contato com meu advogado?', 'Use a seção "Mensagens" do portal para enviar mensagens diretamente ao seu advogado responsável. Você também pode ligar para nosso escritório.', 2),
('Financeiro', 'Como visualizo minhas faturas?', 'Na seção "Financeiro" você pode ver todas as suas faturas, pagamentos realizados e valores pendentes.', 1),
('Financeiro', 'Quais formas de pagamento são aceitas?', 'Aceitamos pagamento via boleto bancário, transferência bancária e PIX. Os dados para pagamento estão disponíveis em cada fatura.', 2),
('Casos', 'Como acompanho o andamento do meu processo?', 'Na seção "Casos" você pode ver o status atualizado de todos os seus processos, incluindo próximas audiências e prazos importantes.', 1),
('Casos', 'O que significam os status dos casos?', 'Aberto: caso recém iniciado. Em Andamento: caso em tramitação. Aguardando Cliente: precisamos de informações suas. Aguardando Tribunal: esperando decisão judicial.', 2);

-- ======================================
-- Permissions
-- ======================================
GRANT SELECT ON client_dashboard_summary TO app_user;
GRANT SELECT, INSERT, UPDATE ON portal_sessions TO app_user;
GRANT SELECT, INSERT, UPDATE ON portal_messages TO app_user;
GRANT SELECT, INSERT ON document_access_logs TO app_user;
GRANT SELECT, INSERT, UPDATE ON portal_notifications TO app_user;
GRANT SELECT, INSERT ON client_activity_logs TO app_user;
GRANT SELECT, INSERT, UPDATE ON portal_settings TO app_user;
GRANT SELECT ON case_updates TO app_user;
GRANT SELECT ON portal_faqs TO app_user;

-- Add comment to track migration
COMMENT ON SCHEMA public IS 'Phase 3: Client Portal - Migration completed';