"use client";

import { useState, useEffect } from 'react';
import ModernClientLayout from "@/components/portal/ModernClientLayout";
import { 
  CreditCardIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  number: string;
  description: string;
  amount: number;
  issue_date: string;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'overdue' | 'paid' | 'cancelled';
  case_id?: string;
  case_name?: string;
  services: {
    description: string;
    hours?: number;
    rate?: number;
    amount: number;
  }[];
  payment_method?: string;
  download_url?: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  date: string;
  method: 'credit_card' | 'bank_transfer' | 'pix' | 'cash' | 'check';
  reference?: string;
  status: 'completed' | 'pending' | 'failed';
}

interface FinancialSummary {
  total_invoiced: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  monthly_average: number;
  last_payment_date?: string;
}

export default function FinancialPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'due'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch real financial data from API
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const response = await fetch('/api/portal/invoices');
        
        if (!response.ok) {
          throw new Error('Failed to fetch financial data');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          // Transform API data to match component interface
          const transformedInvoices: Invoice[] = data.data.invoices.map((apiInvoice: any) => ({
            id: apiInvoice.id,
            number: apiInvoice.invoice_number || 'N/A',
            description: apiInvoice.description,
            amount: Number(apiInvoice.amount),
            issue_date: apiInvoice.created_at,
            due_date: apiInvoice.due_date,
            paid_date: apiInvoice.payment_date,
            status: mapInvoiceStatus(apiInvoice.status),
            case_id: apiInvoice.case_id,
            case_name: apiInvoice.case_title || `Caso ${apiInvoice.case_number || 'N/A'}`,
            services: [
              {
                description: apiInvoice.description,
                amount: Number(apiInvoice.amount)
              }
            ],
            payment_method: apiInvoice.payment_method || undefined,
            download_url: apiInvoice.receipt || undefined
          }));

          // Transform recent payments
          const transformedPayments: Payment[] = data.data.recentPayments?.map((apiPayment: any) => ({
            id: apiPayment.id,
            invoice_id: apiPayment.id,
            amount: Number(apiPayment.amount),
            date: apiPayment.payment_date,
            method: mapPaymentMethod(apiPayment.payment_method),
            reference: apiPayment.invoice_number,
            status: 'completed' as const
          })) || [];

          // Transform summary
          const transformedSummary: FinancialSummary = {
            total_invoiced: Number(data.data.summary.totalWithTax || 0),
            total_paid: Number(data.data.summary.paidAmount || 0),
            total_pending: Number(data.data.summary.pendingAmount || 0),
            total_overdue: Number(data.data.summary.overdueAmount || 0),
            monthly_average: Number(data.data.summary.totalWithTax || 0) / Math.max(1, data.data.summary.totalInvoices || 1),
            last_payment_date: data.data.recentPayments?.[0]?.payment_date
          };

          setInvoices(transformedInvoices);
          setPayments(transformedPayments);
          setSummary(transformedSummary);
        } else {
          console.warn('API response invalid, using empty data');
          setInvoices([]);
          setPayments([]);
          setSummary({
            total_invoiced: 0,
            total_paid: 0,
            total_pending: 0,
            total_overdue: 0,
            monthly_average: 0
          });
        }
      } catch (error) {
        console.error('Error fetching financial data:', error);
        setInvoices([]);
        setPayments([]);
        setSummary({
          total_invoiced: 0,
          total_paid: 0,
          total_pending: 0,
          total_overdue: 0,
          monthly_average: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  // Helper functions to map API data to component format
  const mapInvoiceStatus = (apiStatus: string): Invoice['status'] => {
    const statusMap: Record<string, Invoice['status']> = {
      'Pending': 'pending',
      'Paid': 'paid',
      'Overdue': 'overdue',
      'Cancelled': 'cancelled',
      'Partial': 'pending'
    };
    return statusMap[apiStatus] || 'pending';
  };

  const mapPaymentMethod = (apiMethod: string): Payment['method'] => {
    const methodMap: Record<string, Payment['method']> = {
      'Credit Card': 'credit_card',
      'Bank Transfer': 'bank_transfer',
      'PIX': 'pix',
      'Cash': 'cash',
      'Check': 'check'
    };
    return methodMap[apiMethod] || 'bank_transfer';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pendente',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: ClockIcon,
          iconColor: 'text-yellow-600'
        };
      case 'overdue':
        return {
          label: 'Vencida',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-red-600'
        };
      case 'paid':
        return {
          label: 'Paga',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircleIcon,
          iconColor: 'text-green-600'
        };
      case 'cancelled':
        return {
          label: 'Cancelada',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: ClockIcon,
          iconColor: 'text-gray-600'
        };
      default:
        return {
          label: 'Desconhecido',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: ClockIcon,
          iconColor: 'text-gray-600'
        };
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'credit_card': return 'Cartão de Crédito';
      case 'bank_transfer': return 'Transferência Bancária';
      case 'pix': return 'PIX';
      case 'cash': return 'Dinheiro';
      case 'check': return 'Cheque';
      default: return method;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isOverdue = (invoice: Invoice) => {
    return invoice.status === 'pending' && new Date(invoice.due_date) < new Date();
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === '' || 
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.case_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'date':
        aVal = new Date(a.issue_date).getTime();
        bVal = new Date(b.issue_date).getTime();
        break;
      case 'amount':
        aVal = a.amount;
        bVal = b.amount;
        break;
      case 'due':
        aVal = new Date(a.due_date).getTime();
        bVal = new Date(b.due_date).getTime();
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

  const handleDownloadInvoice = (invoice: Invoice) => {
    // In production, this would download the actual invoice file
    console.log(`Downloading invoice: ${invoice.id}`);
  };

  const handlePayInvoice = (invoice: Invoice) => {
    // In production, this would redirect to payment gateway
    console.log(`Paying invoice: ${invoice.id}`);
  };

  if (isLoading) {
    return (
      <ModernClientLayout title="Financeiro">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </ModernClientLayout>
    );
  }

  return (
    <ModernClientLayout title="Financeiro">
      <div className="space-y-6">
        {/* Financial Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Faturado</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(summary?.total_invoiced || 0)}
                </p>
              </div>
              <ChartBarIcon className="h-6 w-6 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pago</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(summary?.total_paid || 0)}
                </p>
              </div>
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendente</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(summary?.total_pending || 0)}
                </p>
              </div>
              <ClockIcon className="h-6 w-6 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Atraso</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(summary?.total_overdue || 0)}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, descrição ou caso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="overdue">Vencida</option>
                <option value="paid">Paga</option>
                <option value="cancelled">Cancelada</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy as 'date' | 'amount' | 'due');
                  setSortOrder(newSortOrder as 'asc' | 'desc');
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
              >
                <option value="date-desc">Mais Recente</option>
                <option value="date-asc">Mais Antigo</option>
                <option value="amount-desc">Maior Valor</option>
                <option value="amount-asc">Menor Valor</option>
                <option value="due-asc">Vencimento Próximo</option>
                <option value="due-desc">Vencimento Distante</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Faturas</h3>
            <p className="text-sm text-gray-600">
              {filteredInvoices.length} de {invoices.length} faturas
            </p>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma fatura encontrada
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Quando faturas forem emitidas, elas aparecerão aqui.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => {
                const statusInfo = getStatusInfo(invoice.status);
                const StatusIcon = statusInfo.icon;
                const overdue = isOverdue(invoice);

                return (
                  <div key={invoice.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {invoice.number}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${statusInfo.iconColor}`} />
                            {statusInfo.label}
                          </span>
                          {overdue && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              <ExclamationTriangleIcon className="w-3 h-3 mr-1 text-red-600" />
                              Vencida
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{invoice.description}</p>

                        {invoice.case_name && (
                          <p className="text-sm text-blue-600 mb-2">
                            Caso: {invoice.case_name}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CalendarDaysIcon className="w-4 h-4" />
                            <span>Emitida: {formatDate(invoice.issue_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            <span>Vencimento: {formatDate(invoice.due_date)}</span>
                          </div>
                          {invoice.paid_date && (
                            <div className="flex items-center gap-2">
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                              <span>Paga: {formatDate(invoice.paid_date)}</span>
                            </div>
                          )}
                        </div>

                        {invoice.payment_method && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                              Pago via {getPaymentMethodLabel(invoice.payment_method)}
                            </span>
                          </div>
                        )}

                        {/* Services breakdown */}
                        <div className="mt-4">
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-accent-gold hover:text-accent-gold-light">
                              Ver detalhamento dos serviços
                            </summary>
                            <div className="mt-2 space-y-2">
                              {invoice.services.map((service, index) => (
                                <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                  <div>
                                    <span className="font-medium">{service.description}</span>
                                    {service.hours && service.rate && (
                                      <span className="text-gray-500 ml-2">
                                        ({service.hours}h × {formatCurrency(service.rate)})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-semibold">{formatCurrency(service.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>

                      <div className="ml-6 text-right">
                        <p className="text-2xl font-bold text-gray-900 mb-4">
                          {formatCurrency(invoice.amount)}
                        </p>

                        <div className="space-y-2">
                          <button
                            onClick={() => handleDownloadInvoice(invoice)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Baixar PDF
                          </button>

                          {invoice.status === 'pending' && (
                            <button
                              onClick={() => handlePayInvoice(invoice)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-accent-gold hover:bg-accent-gold-light transition-colors"
                            >
                              <CreditCardIcon className="w-4 h-4" />
                              Pagar Agora
                            </button>
                          )}

                          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                            <EyeIcon className="w-4 h-4" />
                            Ver Detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Histórico de Pagamentos</h3>
            </div>

            <div className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <div key={payment.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        Pagamento da Fatura {invoices.find(inv => inv.id === payment.invoice_id)?.number}
                      </p>
                      <p className="text-sm text-gray-600">
                        {getPaymentMethodLabel(payment.method)} • {formatDate(payment.date)}
                      </p>
                      {payment.reference && (
                        <p className="text-xs text-gray-500 mt-1">
                          Referência: {payment.reference}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Confirmado
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModernClientLayout>
  );
}