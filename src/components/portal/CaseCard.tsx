"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  CalendarDaysIcon,
  UserIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
interface CaseCardProps {
  case: {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'waiting_client' | 'completed' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    updated_at: string;
    assigned_lawyer?: string;
    next_action?: string;
    next_action_date?: string;
    progress?: number;
    type: string;
    documents?: number;
    last_update?: string;
  };
  onClick?: () => void;
  showDetails?: boolean;
}

const CaseCard = ({ case: caseData }: CaseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pendente',
          className: 'apple-status-pending',
          icon: ClockIcon
        };
      case 'in_progress':
        return {
          label: 'Em Andamento',
          className: 'apple-status-progress',
          icon: InformationCircleIcon
        };
      case 'waiting_client':
        return {
          label: 'Aguardando Cliente',
          className: 'apple-status-pending',
          icon: ExclamationTriangleIcon
        };
      case 'completed':
        return {
          label: 'Concluído',
          className: 'apple-status-completed',
          icon: CheckCircleIcon
        };
      case 'archived':
        return {
          label: 'Arquivado',
          className: 'apple-status-error',
          icon: DocumentTextIcon
        };
      default:
        return {
          label: 'Desconhecido',
          className: 'apple-status-error',
          icon: InformationCircleIcon
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'var(--apple-red)';
      case 'high':
        return 'var(--apple-orange)';
      case 'medium':
        return 'var(--apple-yellow)';
      case 'low':
        return 'var(--apple-green)';
      default:
        return 'var(--gray-300)';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return 'Indefinida';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusInfo = getStatusInfo(caseData.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="apple-card" style={{
      borderLeft: `4px solid ${getPriorityColor(caseData.priority)}`,
      marginBottom: 'var(--space-4)'
    }}>
      <div className="apple-card-content">
        {/* Header */}
        <div className="apple-flex apple-justify-between apple-mb-4" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="apple-flex apple-items-center apple-mb-2" style={{ gap: 'var(--space-3)' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                margin: '0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {caseData.title}
              </h3>
              <span className={`apple-status ${statusInfo.className}`}>
                <StatusIcon style={{ width: '12px', height: '12px', marginRight: 'var(--space-1)' }} />
                {statusInfo.label}
              </span>
            </div>
            
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '0 0 var(--space-2) 0',
              lineHeight: '1.4'
            }}>
              {caseData.description}
            </p>
            
            <div className="apple-flex apple-items-center" style={{ gap: 'var(--space-4)' }}>
              <span className="apple-flex apple-items-center" style={{ 
                gap: 'var(--space-1)', 
                fontSize: '12px', 
                color: 'var(--text-tertiary)' 
              }}>
                <DocumentTextIcon style={{ width: '14px', height: '14px' }} />
                {caseData.type}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Prioridade: {getPriorityLabel(caseData.priority)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="apple-icon-button"
            style={{ width: '32px', height: '32px' }}
          >
            {isExpanded ? (
              <ChevronDownIcon style={{ width: '16px', height: '16px' }} />
            ) : (
              <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {caseData.progress !== undefined && (
          <div className="apple-mb-4">
            <div className="apple-flex apple-justify-between apple-items-center apple-mb-2">
              <span style={{
                fontSize: '14px',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)'
              }}>Progresso</span>
              <span style={{
                fontSize: '14px',
                color: 'var(--text-secondary)'
              }}>{caseData.progress}%</span>
            </div>
            <div className="apple-progress">
              <div 
                className="apple-progress-fill"
                style={{ width: `${caseData.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Info */}
        <div className="apple-grid apple-grid-cols-2 apple-mb-4" style={{ gap: 'var(--space-4)' }}>
          {caseData.assigned_lawyer && (
            <div className="apple-flex apple-items-center" style={{ 
              gap: 'var(--space-2)', 
              fontSize: '14px', 
              color: 'var(--text-secondary)' 
            }}>
              <UserIcon style={{ width: '16px', height: '16px' }} />
              <span>{caseData.assigned_lawyer}</span>
            </div>
          )}
          
          <div className="apple-flex apple-items-center" style={{ 
            gap: 'var(--space-2)', 
            fontSize: '14px', 
            color: 'var(--text-secondary)' 
          }}>
            <CalendarDaysIcon style={{ width: '16px', height: '16px' }} />
            <span>Criado em {formatDate(caseData.created_at)}</span>
          </div>
          
          {caseData.documents && (
            <div className="apple-flex apple-items-center" style={{ 
              gap: 'var(--space-2)', 
              fontSize: '14px', 
              color: 'var(--text-secondary)' 
            }}>
              <DocumentTextIcon style={{ width: '16px', height: '16px' }} />
              <span>{caseData.documents} documentos</span>
            </div>
          )}
          
          {caseData.last_update && (
            <div className="apple-flex apple-items-center" style={{ 
              gap: 'var(--space-2)', 
              fontSize: '14px', 
              color: 'var(--text-secondary)' 
            }}>
              <ClockIcon style={{ width: '16px', height: '16px' }} />
              <span>Atualizado {formatDateTime(caseData.last_update)}</span>
            </div>
          )}
        </div>

        {/* Next Action */}
        {caseData.next_action && (
          <div style={{
            background: 'rgba(0, 122, 255, 0.08)',
            border: '1px solid rgba(0, 122, 255, 0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            <div className="apple-flex apple-items-center" style={{ gap: 'var(--space-3)' }}>
              <InformationCircleIcon style={{ 
                width: '20px', 
                height: '20px', 
                color: 'var(--apple-blue)',
                flexShrink: 0
              }} />
              <div>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-primary)',
                  margin: '0 0 var(--space-1) 0'
                }}>Próxima Ação</p>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  margin: '0'
                }}>{caseData.next_action}</p>
                {caseData.next_action_date && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--apple-blue)',
                    margin: 'var(--space-1) 0 0 0'
                  }}>
                    Prazo: {formatDate(caseData.next_action_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 'var(--space-4)',
            marginTop: 'var(--space-4)'
          }}>
            <div className="apple-grid apple-grid-cols-2 apple-mb-4" style={{ 
              gap: 'var(--space-4)',
              fontSize: '14px'
            }}>
              <div>
                <span style={{ 
                  fontWeight: 'var(--font-weight-medium)', 
                  color: 'var(--text-primary)' 
                }}>ID do Caso:</span>
                <span style={{ 
                  marginLeft: 'var(--space-2)', 
                  color: 'var(--text-secondary)' 
                }}>{caseData.id}</span>
              </div>
              <div>
                <span style={{ 
                  fontWeight: 'var(--font-weight-medium)', 
                  color: 'var(--text-primary)' 
                }}>Última Atualização:</span>
                <span style={{ 
                  marginLeft: 'var(--space-2)', 
                  color: 'var(--text-secondary)' 
                }}>{formatDateTime(caseData.updated_at)}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="apple-flex" style={{ 
              gap: 'var(--space-2)', 
              flexWrap: 'wrap',
              paddingTop: 'var(--space-2)'
            }}>
              <Link
                href={`/portal/cases/${caseData.id}`}
                className="apple-button apple-button-primary"
              >
                Ver Detalhes
              </Link>
              
              <Link
                href={`/portal/cases/${caseData.id}/documents`}
                className="apple-button apple-button-secondary"
              >
                Documentos
              </Link>
              
              <Link
                href={`/portal/messages?case=${caseData.id}`}
                className="apple-button apple-button-secondary"
              >
                Mensagens
              </Link>
            </div>
          </div>
        )}

        {/* Footer with actions */}
        {!isExpanded && (
          <div className="apple-flex apple-items-center apple-justify-between" style={{
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border)'
          }}>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)'
            }}>
              Última atualização: {formatDateTime(caseData.updated_at)}
            </div>
            <Link
              href={`/portal/cases/${caseData.id}`}
              className="apple-button apple-button-text"
              style={{ padding: '0' }}
            >
              Ver detalhes →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseCard;