"use client";

import { useState, useEffect } from 'react';
import ModernClientLayout from "@/components/portal/ModernClientLayout";
import { 
  MagnifyingGlassIcon,
  DocumentIcon
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

interface FilterOptions {
  status: string[];
  type: string[];
  category: string[];
  case_id: string[];
}

interface Category {
  name: string;
  count: number;
  documents: Document[];
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'category'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    type: [],
    category: [],
    case_id: []
  });

  // Fetch real data from API
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('/api/portal/documents');
        
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          // Transform API data to match component interface
          const transformedDocuments: Document[] = data.data.map((apiDoc: any) => ({
            id: apiDoc.id,
            name: apiDoc.document_name,
            description: `Documento do caso ${apiDoc.case_number}`,
            type: mapDocumentType(apiDoc.document_type),
            category: apiDoc.document_type,
            size: apiDoc.file_size,
            mime_type: getMimeTypeFromName(apiDoc.document_name),
            status: mapDocumentStatus(apiDoc.status),
            created_at: apiDoc.upload_date || apiDoc.created_at,
            updated_at: apiDoc.last_modified || apiDoc.created_at,
            uploaded_by: 'Dr. D\'avila Reis',
            case_id: apiDoc.case_id,
            case_name: apiDoc.case_title,
            tags: apiDoc.tags || [],
            is_private: apiDoc.access_level === 'Client Only',
            download_count: 0, // TODO: Implement download tracking
            version: parseFloat(apiDoc.version) || 1,
            signature_required: apiDoc.signature_required || false,
            signed_at: apiDoc.clicksign_status === 'signed' ? apiDoc.last_modified : undefined,
            expires_at: apiDoc.expiry_date
          }));

          setDocuments(transformedDocuments);
          setFilteredDocuments(transformedDocuments);

          // Group documents by category
          const categoryMap = new Map<string, Document[]>();
          transformedDocuments.forEach(doc => {
            if (!categoryMap.has(doc.category)) {
              categoryMap.set(doc.category, []);
            }
            categoryMap.get(doc.category)!.push(doc);
          });

          const categoriesData = Array.from(categoryMap.entries()).map(([name, docs]) => ({
            name,
            count: docs.length,
            documents: docs
          }));

        } else {
          console.warn('API response invalid, using empty data');
          setDocuments([]);
          setFilteredDocuments([]);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
        setDocuments([]);
        setFilteredDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Helper functions to map API data to component format
  const mapDocumentType = (apiType: string): Document['type'] => {
    const typeMap: Record<string, Document['type']> = {
      'Contract': 'contract',
      'Court Filing': 'evidence',
      'Legal Opinion': 'correspondence',
      'Compliance Report': 'report',
      'Invoice': 'invoice',
      'Evidence': 'evidence',
      'Correspondence': 'correspondence'
    };
    return typeMap[apiType] || 'other';
  };

  const mapDocumentStatus = (apiStatus: string): Document['status'] => {
    const statusMap: Record<string, Document['status']> = {
      'Draft': 'draft',
      'Under Review': 'review',
      'Approved': 'approved',
      'Signed': 'signed',
      'Archived': 'archived'
    };
    return statusMap[apiStatus] || 'draft';
  };

  const getMimeTypeFromName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };
    return mimeMap[extension || ''] || 'application/octet-stream';
  };

  // Filter and search logic
  useEffect(() => {
    const filtered = documents.filter(doc => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(doc.status);
      
      // Type filter
      const matchesType = filters.type.length === 0 || filters.type.includes(doc.type);
      
      // Category filter
      const matchesCategory = filters.category.length === 0 || filters.category.includes(doc.category);
      
      // Case filter
      const matchesCase = filters.case_id.length === 0 || (doc.case_id && filters.case_id.includes(doc.case_id));

      return matchesSearch && matchesStatus && matchesType && matchesCategory && matchesCase;
    });

    // Sort logic
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
        case 'size':
          aVal = a.size;
          bVal = b.size;
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, filters, sortBy, sortOrder]);

  const handleFilterChange = (category: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      type: [],
      category: [],
      case_id: []
    });
    setSearchTerm('');
  };

  const statusOptions = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'review', label: 'Em Revisão' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'signed', label: 'Assinado' },
    { value: 'archived', label: 'Arquivado' }
  ];

  const typeOptions = [
    { value: 'contract', label: 'Contrato' },
    { value: 'evidence', label: 'Evidência' },
    { value: 'correspondence', label: 'Correspondência' },
    { value: 'report', label: 'Relatório' },
    { value: 'invoice', label: 'Fatura' },
    { value: 'other', label: 'Outro' }
  ];

  const categoryOptions = [
    ...new Set(documents.map(doc => doc.category))
  ].map(category => ({ value: category, label: category }));

  const caseOptions = [
    ...new Set(documents.map(doc => doc.case_id).filter(Boolean))
  ].map(case_id => ({
    value: case_id!,
    label: documents.find(doc => doc.case_id === case_id)?.case_name || case_id!
  }));

  if (isLoading) {
    return (
      <ModernClientLayout title="Meus Documentos">
        <div className="animate-pulse space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ModernClientLayout>
    );
  }

  return (
    <ModernClientLayout title="Meus Documentos">
      <div className="apple-content-container" style={{ gap: 'var(--space-6)' }}>
        {/* Header */}
        <div className="apple-card">
          <div className="apple-card-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="apple-heading-large">Meus Documentos</h2>
                <p className="apple-text-secondary mt-1">
                  {filteredDocuments.length} de {documents.length} documentos
                </p>
              </div>
              <div className="apple-badge apple-badge-primary">
                {documents.length} Total
              </div>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="apple-card">
          <div className="apple-card-content">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="apple-input pl-10"
                />
              </div>

              {/* View Controls */}
              <div className="flex gap-2">
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'grid' | 'list' | 'category')}
                  className="apple-select"
                >
                  <option value="grid">Grade</option>
                  <option value="list">Lista</option>
                  <option value="category">Categorias</option>
                </select>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                    setSortBy(newSortBy as 'name' | 'date' | 'size' | 'type');
                    setSortOrder(newSortOrder as 'asc' | 'desc');
                  }}
                  className="apple-select"
                >
                  <option value="date-desc">Mais Recente</option>
                  <option value="date-asc">Mais Antigo</option>
                  <option value="name-asc">Nome A-Z</option>
                  <option value="name-desc">Nome Z-A</option>
                  <option value="size-desc">Maior Tamanho</option>
                  <option value="size-asc">Menor Tamanho</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Display */}
        {filteredDocuments.length === 0 ? (
          <div className="apple-empty-state">
            <DocumentIcon className="apple-empty-icon" />
            <h3 className="apple-empty-title">
              {searchTerm ? 'Nenhum documento encontrado' : 'Nenhum documento disponível'}
            </h3>
            <p className="apple-empty-description">
              {searchTerm 
                ? 'Tente ajustar os termos de busca.' 
                : 'Quando documentos forem adicionados aos seus casos, eles aparecerão aqui.'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDocuments.map(document => (
              <div key={document.id} className="apple-card apple-card-hover">
                <div className="apple-card-content">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="apple-document-icon">
                        <DocumentIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="apple-heading-medium">{document.name}</h3>
                          <span className="apple-badge apple-badge-secondary">
                            {document.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {document.description && (
                          <p className="apple-text-secondary mb-2">{document.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="apple-text-tertiary">
                            Tamanho: {formatFileSize(document.size)}
                          </span>
                          <span className="apple-text-tertiary">
                            Modificado: {new Date(document.updated_at).toLocaleDateString('pt-BR')}
                          </span>
                          {document.case_name && (
                            <span className="apple-text-tertiary">
                              Caso: {document.case_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="apple-button-secondary apple-button-small">
                        Visualizar
                      </button>
                      <button className="apple-button-primary apple-button-small">
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModernClientLayout>
  );

  // Helper function for file size formatting
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
