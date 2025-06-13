"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  name: string;
  description?: string;
  type: 'contract' | 'evidence' | 'correspondence' | 'report' | 'invoice' | 'other';
  category: string;
  size: number;
  mime_type: string;
  status: 'draft' | 'review' | 'approved' | 'signed' | 'archived';
  created_at: string;
  updated_at: string;
  uploaded_by: string;
  case_id?: string;
  case_name?: string;
  tags?: string[];
  is_private: boolean;
  download_count: number;
  last_downloaded?: string;
  version: number;
  signature_required?: boolean;
  signed_at?: string;
  expires_at?: string;
}

interface DocumentCardProps {
  document: Document;
  showPreview?: boolean;
  compact?: boolean;
}

const DocumentCard = ({ document, showPreview = false, compact = false }: DocumentCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const getFileIcon = (mime_type: string) => {
    if (mime_type.includes('pdf')) return DocumentIcon;
    if (mime_type.includes('image')) return PhotoIcon;
    if (mime_type.includes('text') || mime_type.includes('document')) return DocumentTextIcon;
    return DocumentIcon;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Rascunho',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: ClockIcon,
          iconColor: 'text-gray-600'
        };
      case 'review':
        return {
          label: 'Em Revisão',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-yellow-600'
        };
      case 'approved':
        return {
          label: 'Aprovado',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircleIcon,
          iconColor: 'text-green-600'
        };
      case 'signed':
        return {
          label: 'Assinado',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: CheckCircleIcon,
          iconColor: 'text-blue-600'
        };
      case 'archived':
        return {
          label: 'Arquivado',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: DocumentIcon,
          iconColor: 'text-gray-600'
        };
      default:
        return {
          label: 'Desconhecido',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: DocumentIcon,
          iconColor: 'text-gray-600'
        };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contract': return 'Contrato';
      case 'evidence': return 'Evidência';
      case 'correspondence': return 'Correspondência';
      case 'report': return 'Relatório';
      case 'invoice': return 'Fatura';
      case 'other': return 'Outro';
      default: return 'Documento';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/portal/documents/${document.id}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const element = window.document.createElement('a');
      element.href = url;
      element.download = document.name;
      element.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Erro ao baixar documento. Tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = () => {
    // Open document preview in new tab
    const previewUrl = `/api/portal/documents/${document.id}/preview`;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const FileIcon = getFileIcon(document.mime_type);
  const statusInfo = getStatusInfo(document.status);
  const StatusIcon = statusInfo.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group">
        <FileIcon className="h-6 w-6 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{document.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(document.size)} • {getTypeLabel(document.type)}</p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handlePreview}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <FileIcon className="h-8 w-8 text-gray-500 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {document.name}
                </h3>
                {document.is_private && (
                  <LockClosedIcon className="h-4 w-4 text-gray-400" />
                )}
              </div>
              
              {document.description && (
                <p className="text-sm text-gray-600 mb-2">{document.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{getTypeLabel(document.type)}</span>
                <span>{formatFileSize(document.size)}</span>
                <span>v{document.version}</span>
                {document.download_count > 0 && (
                  <span>{document.download_count} downloads</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
              <StatusIcon className={`w-3 h-3 mr-1 ${statusInfo.iconColor}`} />
              {statusInfo.label}
            </span>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-5 h-5" />
              ) : (
                <ChevronRightIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Case Association */}
        {document.case_id && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <DocumentTextIcon className="w-4 h-4" />
            <span>Associado ao caso:</span>
            <Link
              href={`/portal/cases/${document.case_id}`}
              className="text-accent-gold hover:text-accent-gold-light font-medium"
            >
              {document.case_name || document.case_id}
            </Link>
          </div>
        )}

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <TagIcon className="w-4 h-4 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {document.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <CalendarDaysIcon className="w-4 h-4" />
            <span>Criado em {formatDate(document.created_at)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <UserIcon className="w-4 h-4" />
            <span>Por {document.uploaded_by}</span>
          </div>
          
          {document.last_downloaded && (
            <div className="flex items-center gap-2 text-gray-600">
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Último download: {formatDate(document.last_downloaded)}</span>
            </div>
          )}
          
          {document.expires_at && (
            <div className="flex items-center gap-2 text-red-600">
              <ClockIcon className="w-4 h-4" />
              <span>Expira em {formatDate(document.expires_at)}</span>
            </div>
          )}
        </div>

        {/* Signature Info */}
        {document.signature_required && (
          <div className={`rounded-lg p-3 mb-4 ${
            document.signed_at 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              {document.signed_at ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Documento Assinado</p>
                    <p className="text-sm text-green-700">Assinado em {formatDate(document.signed_at)}</p>
                  </div>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Assinatura Pendente</p>
                    <p className="text-sm text-yellow-700">Este documento requer sua assinatura</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="font-medium text-gray-700">ID do Documento:</span>
                <span className="ml-2 text-gray-600">{document.id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Categoria:</span>
                <span className="ml-2 text-gray-600">{document.category}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tipo de Arquivo:</span>
                <span className="ml-2 text-gray-600">{document.mime_type}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Última Modificação:</span>
                <span className="ml-2 text-gray-600">{formatDate(document.updated_at)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          {showPreview && (
            <button
              onClick={handlePreview}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              Visualizar
            </button>
          )}
          
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-accent-gold hover:bg-accent-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            {isDownloading ? 'Baixando...' : 'Baixar'}
          </button>
          
          {document.signature_required && !document.signed_at && (
            <button className="inline-flex items-center gap-1 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <CheckCircleIcon className="w-4 h-4" />
              Assinar
            </button>
          )}
          
          {document.case_id && (
            <Link
              href={`/portal/cases/${document.case_id}`}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <DocumentTextIcon className="w-4 h-4" />
              Ver Caso
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;