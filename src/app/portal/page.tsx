"use client";

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import ModernClientLayout from '@/components/portal/ModernClientLayout';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  activeCases: number;
  pendingTasks: number;
  completedTasks: number;
  unreadMessages: number;
  outstandingInvoices: number;
  monthlyProgress: number;
}

interface QuickAction {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant: 'primary' | 'success' | 'warning' | 'secondary';
}

interface RecentActivity {
  id: string;
  type: 'case_update' | 'document' | 'message' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  variant: 'primary' | 'success' | 'warning';
}

export default function PortalDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    activeCases: 3,
    pendingTasks: 7,
    completedTasks: 23,
    unreadMessages: 2,
    outstandingInvoices: 1,
    monthlyProgress: 76
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and fetch data
    const timer = setTimeout(() => {
      setRecentActivity([
        {
          id: '1',
          type: 'case_update',
          title: 'Caso 2024-001 atualizado',
          description: 'Processo trabalhista - Nova audiência agendada',
          timestamp: 'Há 2 horas',
          variant: 'primary'
        },
        {
          id: '2',
          type: 'document',
          title: 'Documento disponível',
          description: 'Contrato de prestação de serviços assinado',
          timestamp: 'Ontem',
          variant: 'success'
        },
        {
          id: '3',
          type: 'message',
          title: 'Nova mensagem de Dr. D\'avila',
          description: 'Sobre o andamento do seu processo',
          timestamp: '2 dias atrás',
          variant: 'primary'
        }
      ]);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const quickActions: QuickAction[] = [
    {
      name: 'Ver Casos',
      href: '/portal/cases',
      icon: DocumentTextIcon,
      description: 'Acompanhar processos ativos',
      variant: 'primary'
    },
    {
      name: 'Documentos',
      href: '/portal/documents',
      icon: DocumentTextIcon,
      description: 'Acessar documentos',
      variant: 'success'
    },
    {
      name: 'Mensagens',
      href: '/portal/messages',
      icon: ChatBubbleLeftRightIcon,
      description: 'Conversar com advogados',
      variant: 'warning'
    },
    {
      name: 'Financeiro',
      href: '/portal/financial',
      icon: CurrencyDollarIcon,
      description: 'Ver faturas e pagamentos',
      variant: 'secondary'
    }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (isLoading) {
    return (
      <ModernClientLayout title="Dashboard">
        <div className="portal-loading">
          <div className="portal-spinner" />
        </div>
      </ModernClientLayout>
    );
  }

  return (
    <ModernClientLayout title="Dashboard">
      <div className="apple-grid apple-grid-cols-1">
        {/* Welcome Banner */}
        <div className="apple-welcome">
          <div className="apple-welcome-content">
            <h2 className="apple-welcome-title">
              {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'Usuário'}!
            </h2>
            <p className="apple-welcome-subtitle">
              Acompanhe o status dos seus processos e mantenha-se informado sobre todas as novidades.
            </p>
            <div className="apple-welcome-badge">
              {session?.user?.company || 'Sua Empresa'}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="apple-stats-grid">
          <div className="apple-stat-card" style={{ '--stat-color': 'var(--apple-blue)' } as React.CSSProperties}>
            <div className="apple-stat-header">
              <span className="apple-stat-label">Casos Ativos</span>
              <DocumentTextIcon className="apple-stat-icon" />
            </div>
            <div className="apple-stat-value">{stats.activeCases}</div>
            <div className="apple-stat-change positive">
              <ArrowUpIcon style={{ width: '12px', height: '12px' }} />
              +1 este mês
            </div>
          </div>

          <div className="apple-stat-card" style={{ '--stat-color': 'var(--apple-orange)' } as React.CSSProperties}>
            <div className="apple-stat-header">
              <span className="apple-stat-label">Tarefas Pendentes</span>
              <ClockIcon className="apple-stat-icon" />
            </div>
            <div className="apple-stat-value">{stats.pendingTasks}</div>
            <div className="apple-stat-change negative">
              Requer atenção
            </div>
          </div>

          <div className="apple-stat-card" style={{ '--stat-color': 'var(--apple-green)' } as React.CSSProperties}>
            <div className="apple-stat-header">
              <span className="apple-stat-label">Mensagens</span>
              <ChatBubbleLeftRightIcon className="apple-stat-icon" />
            </div>
            <div className="apple-stat-value">{stats.unreadMessages}</div>
            <div className="apple-stat-change">
              não lidas
            </div>
          </div>

          <div className="apple-stat-card" style={{ '--stat-color': 'var(--apple-red)' } as React.CSSProperties}>
            <div className="apple-stat-header">
              <span className="apple-stat-label">Faturas Pendentes</span>
              <ExclamationTriangleIcon className="apple-stat-icon" />
            </div>
            <div className="apple-stat-value">{stats.outstandingInvoices}</div>
            <div className="apple-stat-change">
              Vence em 5 dias
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title">Ações Rápidas</h3>
            <p className="apple-card-subtitle">Acesse rapidamente as principais funcionalidades</p>
          </div>
          <div className="apple-card-content">
            <div className="apple-grid apple-grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                const actionColors = {
                  primary: 'var(--apple-blue)',
                  success: 'var(--apple-green)',
                  warning: 'var(--apple-orange)',
                  secondary: 'var(--apple-purple)'
                };
                return (
                  <a
                    key={action.name}
                    href={action.href}
                    style={{
                      background: actionColors[action.variant],
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-5)',
                      color: 'white',
                      textDecoration: 'none',
                      display: 'block',
                      transition: 'all var(--transition-normal)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    className="apple-card"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                      <Icon className="w-6 h-6" />
                      <h4 style={{ 
                        fontSize: '16px', 
                        fontWeight: 'var(--font-weight-semibold)', 
                        margin: '0' 
                      }}>{action.name}</h4>
                    </div>
                    <p style={{ 
                      fontSize: '14px', 
                      opacity: '0.9', 
                      margin: '0',
                      lineHeight: '1.4'
                    }}>{action.description}</p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="apple-grid apple-grid-cols-2">
          {/* Recent Activity */}
          <div className="apple-card">
            <div className="apple-card-header">
              <h3 className="apple-card-title">Atividades Recentes</h3>
              <p className="apple-card-subtitle">Últimas atualizações dos seus processos</p>
            </div>
            <div className="apple-card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {recentActivity.map((activity) => {
                  const activityColors = {
                    primary: 'var(--apple-blue)',
                    success: 'var(--apple-green)',
                    warning: 'var(--apple-orange)'
                  };
                  return (
                    <div key={activity.id} className="apple-activity-item" style={{ '--activity-color': activityColors[activity.variant] } as React.CSSProperties}>
                      <div className="apple-activity-icon">
                        <DocumentTextIcon style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div className="apple-activity-content">
                        <h4>{activity.title}</h4>
                        <p>{activity.description}</p>
                        <div className="apple-activity-time">{activity.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ 
                marginTop: 'var(--space-4)', 
                paddingTop: 'var(--space-4)', 
                borderTop: '1px solid var(--border)' 
              }}>
                <a
                  href="/portal/notifications"
                  className="apple-button apple-button-text"
                  style={{ justifyContent: 'flex-start', padding: '0' }}
                >
                  Ver todas as atividades 
                  <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
                </a>
              </div>
            </div>
          </div>

          {/* Progress & Upcoming */}
          <div className="apple-card">
            <div className="apple-card-header">
              <h3 className="apple-card-title">Progresso do Mês</h3>
              <p className="apple-card-subtitle">Acompanhe seu progresso</p>
            </div>
            <div className="apple-card-content">
              {/* Monthly Progress */}
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div className="apple-flex apple-justify-between apple-items-center apple-mb-4">
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tarefas Concluídas</span>
                  <span style={{ fontSize: '14px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>{stats.completedTasks}</span>
                </div>
                <div className="apple-progress">
                  <div 
                    className="apple-progress-fill"
                    style={{ width: `${stats.monthlyProgress}%` }}
                  />
                </div>
                <div className="apple-stat-change positive" style={{ marginTop: 'var(--space-2)' }}>
                  <ArrowUpIcon style={{ width: '12px', height: '12px' }} />
                  {stats.monthlyProgress}% concluído
                </div>
              </div>

              {/* Next Appointment */}
              <div style={{ 
                background: 'rgba(0, 122, 255, 0.08)', 
                border: '1px solid rgba(0, 122, 255, 0.2)', 
                borderRadius: 'var(--radius-lg)', 
                padding: 'var(--space-4)'
              }}>
                <div className="apple-flex apple-items-center apple-mb-4" style={{ gap: 'var(--space-3)' }}>
                  <CalendarDaysIcon style={{ width: '24px', height: '24px', color: 'var(--apple-blue)' }} />
                  <div>
                    <h4 style={{ 
                      margin: '0', 
                      fontSize: '16px', 
                      fontWeight: 'var(--font-weight-semibold)', 
                      color: 'var(--text-primary)' 
                    }}>
                      Próxima Reunião
                    </h4>
                    <p style={{ 
                      margin: '0', 
                      fontSize: '14px', 
                      color: 'var(--text-secondary)' 
                    }}>
                      15 de junho às 14:30
                    </p>
                  </div>
                </div>
                <button className="apple-button apple-button-primary" style={{ width: '100%' }}>
                  Ver Detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernClientLayout>
  );
}