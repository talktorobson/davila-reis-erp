"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ModernClientLayout from "@/components/portal/ModernClientLayout";
import { 
  MagnifyingGlassIcon,
  DocumentPlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Case {
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
}

interface FilterOptions {
  status: string[];
  priority: string[];
  type: string[];
}

export default function CasesPage() {
  const { data: _session } = useSession();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    priority: [],
    type: []
  });

  // Fetch real data from API
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await fetch('/api/portal/cases');
        
        if (!response.ok) {
          throw new Error('Failed to fetch cases');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          // Transform API data to match component interface
          const transformedCases: Case[] = data.data.map((apiCase: any) => ({
            id: apiCase.case_number,
            title: apiCase.case_title,
            description: apiCase.description,
            status: apiCase.status?.toLowerCase().replace(/[^a-z]/g, '_') || 'pending',
            priority: apiCase.priority?.toLowerCase() || 'medium',
            type: apiCase.service_type || 'Direito Empresarial',
            created_at: apiCase.created_at,
            updated_at: apiCase.updated_at,
            assigned_lawyer: 'Dr. D\'avila Reis',
            next_action: apiCase.next_steps,
            next_action_date: apiCase.due_date,
            progress: apiCase.progress_percentage || 0,
            documents: apiCase.document_count || 0,
            last_update: apiCase.updated_at
          }));

          setCases(transformedCases);
          setFilteredCases(transformedCases);
        } else {
          // Fallback to mock data if API fails
          console.warn('API response invalid, using mock data');
          setCases([]);
          setFilteredCases([]);
        }
      } catch (error) {
        console.error('Error fetching cases:', error);
        // Use empty array if API fails
        setCases([]);
        setFilteredCases([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, []);

  // Filter and search logic
  useEffect(() => {
    const filtered = cases.filter(case_ => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.id.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(case_.status);
      
      // Priority filter
      const matchesPriority = filters.priority.length === 0 || filters.priority.includes(case_.priority);
      
      // Type filter
      const matchesType = filters.type.length === 0 || filters.type.includes(case_.type);

      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });

    // Sort logic
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'date':
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
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

    setFilteredCases(filtered);
  }, [cases, searchTerm, filters, sortBy, sortOrder]);

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
      priority: [],
      type: []
    });
    setSearchTerm('');
  };

  const getStatusCount = (status: string) => {
    return cases.filter(case_ => case_.status === status).length;
  };

  const getPriorityCount = (priority: string) => {
    return cases.filter(case_ => case_.priority === priority).length;
  };

  const statusOptions = [
    { value: 'pending', label: 'Pendente', count: getStatusCount('pending') },
    { value: 'in_progress', label: 'Em Andamento', count: getStatusCount('in_progress') },
    { value: 'waiting_client', label: 'Aguardando Cliente', count: getStatusCount('waiting_client') },
    { value: 'completed', label: 'Concluído', count: getStatusCount('completed') },
    { value: 'archived', label: 'Arquivado', count: getStatusCount('archived') }
  ];

  const priorityOptions = [
    { value: 'urgent', label: 'Urgente', count: getPriorityCount('urgent') },
    { value: 'high', label: 'Alta', count: getPriorityCount('high') },
    { value: 'medium', label: 'Média', count: getPriorityCount('medium') },
    { value: 'low', label: 'Baixa', count: getPriorityCount('low') }
  ];

  const typeOptions = [
    ...new Set(cases.map(case_ => case_.type))
  ].map(type => ({
    value: type,
    label: type,
    count: cases.filter(case_ => case_.type === type).length
  }));

  if (isLoading) {
    return (
      <ModernClientLayout title="Meus Casos">
        <div className="animate-pulse space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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

  // Helper functions for filters
  const getActiveFilterCount = () => {
    return filters.status.length + filters.priority.length + filters.type.length;
  };

  const removeFilter = (category: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item !== value)
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      status: [],
      priority: [],
      type: []
    });
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#FF9500',
      in_progress: '#007AFF', 
      waiting_client: '#FFCC00',
      completed: '#34C759',
      archived: '#8E8E93'
    };
    return colors[status as keyof typeof colors] || '#8E8E93';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: '#FF3B30',
      high: '#FF9500', 
      medium: '#FFCC00',
      low: '#8E8E93'
    };
    return colors[priority as keyof typeof colors] || '#8E8E93';
  };

  return (
    <ModernClientLayout title="Meus Casos">
      <div className="apple-content-container" style={{ gap: 'var(--space-6)' }}>
        {/* Header Summary */}
        <div className="apple-card">
          <div className="apple-card-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="apple-heading-large">Meus Casos</h2>
                <p className="apple-text-secondary mt-1">
                  {filteredCases.length} de {cases.length} casos
                </p>
              </div>
              <div className="apple-badge apple-badge-primary">
                {cases.length} Total
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
                  placeholder="Buscar casos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="apple-input pl-10"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                    setSortBy(newSortBy as 'date' | 'priority' | 'status');
                    setSortOrder(newSortOrder as 'asc' | 'desc');
                  }}
                  className="apple-select"
                >
                  <option value="date-desc">Mais Recente</option>
                  <option value="date-asc">Mais Antigo</option>
                  <option value="priority-desc">Prioridade ↓</option>
                  <option value="priority-asc">Prioridade ↑</option>
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {getActiveFilterCount() > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="apple-text-secondary text-sm">Filtros:</span>
                {filters.status.map(status => (
                  <span key={status} className="apple-chip apple-chip-blue">
                    {statusOptions.find(opt => opt.value === status)?.label}
                    <button
                      onClick={() => removeFilter('status', status)}
                      className="ml-1 hover:text-red-600"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {filters.priority.map(priority => (
                  <span key={priority} className="apple-chip apple-chip-orange">
                    {priorityOptions.find(opt => opt.value === priority)?.label}
                    <button
                      onClick={() => removeFilter('priority', priority)}
                      className="ml-1 hover:text-red-600"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="apple-button-text apple-button-small text-red-600"
                >
                  Limpar todos
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cases Grid */}
        {filteredCases.length === 0 ? (
          <div className="apple-empty-state">
            <DocumentPlusIcon className="apple-empty-icon" />
            <h3 className="apple-empty-title">
              {searchTerm || getActiveFilterCount() > 0
                ? 'Nenhum caso encontrado'
                : 'Nenhum caso cadastrado'
              }
            </h3>
            <p className="apple-empty-description">
              {searchTerm || getActiveFilterCount() > 0
                ? 'Tente ajustar os filtros ou termos de busca.'
                : 'Quando você tiver casos em andamento, eles aparecerão aqui.'
              }
            </p>
            {(searchTerm || getActiveFilterCount() > 0) && (
              <button
                onClick={clearAllFilters}
                className="apple-button-secondary mt-4"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCases.map(case_ => (
              <div key={case_.id} className="apple-card apple-card-hover">
                <div className="apple-card-content">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="apple-heading-medium">{case_.title}</h3>
                        <span 
                          className="apple-badge"
                          style={{ backgroundColor: getStatusColor(case_.status) }}
                        >
                          {statusOptions.find(opt => opt.value === case_.status)?.label}
                        </span>
                        <span 
                          className="apple-badge apple-badge-outline"
                          style={{ borderColor: getPriorityColor(case_.priority), color: getPriorityColor(case_.priority) }}
                        >
                          {priorityOptions.find(opt => opt.value === case_.priority)?.label}
                        </span>
                      </div>
                      <p className="apple-text-secondary mb-3">{case_.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="apple-text-tertiary">ID: {case_.id}</span>
                        <span className="apple-text-tertiary">Tipo: {case_.type}</span>
                        {case_.progress !== undefined && (
                          <span className="apple-text-tertiary">Progresso: {case_.progress}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="apple-button-secondary apple-button-small">
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                  {case_.next_action && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="apple-text-small apple-text-secondary">
                        <strong>Próxima ação:</strong> {case_.next_action}
                        {case_.next_action_date && (
                          <span className="ml-2">({new Date(case_.next_action_date).toLocaleDateString('pt-BR')})</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModernClientLayout>
  );
}