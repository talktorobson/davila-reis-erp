"use client";

import { useState, useEffect } from 'react';
import { 
  BellIcon,
  XMarkIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: 'case_update' | 'document' | 'message' | 'payment' | 'appointment' | 'system' | 'deadline';
  title: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  case_id?: string;
  document_id?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationCenter = ({ isOpen, onClose, onNotificationClick }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Mock notifications - in production, this would fetch from API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockNotifications: Notification[] = [
          {
            id: 'notif-1',
            type: 'case_update',
            title: 'Atualização no Caso #2024-001',
            message: 'Novos documentos foram adicionados ao seu processo trabalhista.',
            timestamp: '2024-06-11T10:30:00Z',
            is_read: false,
            priority: 'high',
            action_url: '/portal/cases/CASE-2024-001',
            case_id: 'CASE-2024-001'
          },
          {
            id: 'notif-2',
            type: 'message',
            title: 'Nova mensagem de Dr. D\'avila',
            message: 'Confirmo nossa reunião para quinta-feira às 14h.',
            timestamp: '2024-06-10T15:45:00Z',
            is_read: false,
            priority: 'medium',
            action_url: '/portal/messages'
          },
          {
            id: 'notif-3',
            type: 'deadline',
            title: 'Prazo Importante',
            message: 'Você tem até amanhã para revisar e assinar o contrato.',
            timestamp: '2024-06-10T09:00:00Z',
            is_read: false,
            priority: 'urgent',
            action_url: '/portal/documents/DOC-2024-001',
            document_id: 'DOC-2024-001'
          },
          {
            id: 'notif-4',
            type: 'payment',
            title: 'Fatura Disponível',
            message: 'Nova fatura dos serviços de maio está disponível para pagamento.',
            timestamp: '2024-06-09T16:20:00Z',
            is_read: true,
            priority: 'medium',
            action_url: '/portal/financial'
          },
          {
            id: 'notif-5',
            type: 'appointment',
            title: 'Reunião Agendada',
            message: 'Reunião confirmada para 13/06 às 14h no escritório.',
            timestamp: '2024-06-08T11:15:00Z',
            is_read: true,
            priority: 'low',
            action_url: '/portal/appointments'
          },
          {
            id: 'notif-6',
            type: 'document',
            title: 'Documento Assinado',
            message: 'O relatório de compliance foi assinado com sucesso.',
            timestamp: '2024-06-07T14:30:00Z',
            is_read: true,
            priority: 'low',
            action_url: '/portal/documents/DOC-2024-003',
            document_id: 'DOC-2024-003'
          }
        ];

        setNotifications(mockNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'case_update':
        return DocumentTextIcon;
      case 'message':
        return ChatBubbleLeftRightIcon;
      case 'payment':
        return CreditCardIcon;
      case 'appointment':
        return CalendarDaysIcon;
      case 'deadline':
        return ExclamationTriangleIcon;
      case 'document':
        return DocumentTextIcon;
      case 'system':
        return InformationCircleIcon;
      default:
        return BellIcon;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'text-red-600 bg-red-100';
    if (priority === 'high') return 'text-orange-600 bg-orange-100';
    
    switch (type) {
      case 'case_update':
        return 'text-blue-600 bg-blue-100';
      case 'message':
        return 'text-green-600 bg-green-100';
      case 'payment':
        return 'text-yellow-600 bg-yellow-100';
      case 'appointment':
        return 'text-purple-600 bg-purple-100';
      case 'deadline':
        return 'text-red-600 bg-red-100';
      case 'document':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      return 'Agora';
    } else if (hours < 24) {
      return `${hours}h atrás`;
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
  };


  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    
    onClose();
  };

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.is_read;
      case 'important':
        return notif.priority === 'high' || notif.priority === 'urgent';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(notif => !notif.is_read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:absolute lg:inset-auto lg:top-12 lg:right-0 lg:w-96">
      {/* Mobile backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 lg:hidden"
        onClick={onClose}
      />
      
      {/* Notification panel */}
      <div className="absolute inset-x-4 top-4 bottom-4 lg:inset-auto lg:top-0 lg:right-0 lg:w-96 lg:max-h-[32rem] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'unread', label: 'Não lidas' },
            { key: 'important', label: 'Importantes' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as 'all' | 'unread' | 'important')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'text-accent-gold border-b-2 border-accent-gold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 border-b border-gray-200">
            <button
              onClick={markAllAsRead}
              className="text-sm text-accent-gold hover:text-accent-gold-light font-medium"
            >
              Marcar todas como lidas
            </button>
          </div>
        )}

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 px-4">
              <BellIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'Todas as notificações foram lidas' : 'Nenhuma notificação'}
              </h4>
              <p className="text-gray-500 text-sm">
                {filter === 'unread' 
                  ? 'Quando você receber novas notificações, elas aparecerão aqui.'
                  : 'Você está em dia com todas as suas notificações.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClasses = getNotificationColor(notification.type, notification.priority);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${colorClasses}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-medium text-gray-900 ${
                            !notification.is_read ? 'font-semibold' : ''
                          }`}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center gap-1 ml-2">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTime(notification.timestamp)}
                            </span>
                            
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-accent-gold rounded-full"></div>
                            )}
                            
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Show options menu
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <EllipsisVerticalIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        
                        {notification.priority === 'urgent' && (
                          <div className="flex items-center gap-1 mt-2">
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                            <span className="text-xs font-medium text-red-600">URGENTE</span>
                          </div>
                        )}
                        
                        {notification.case_id && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              Caso: {notification.case_id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                // Navigate to full notifications page
                window.location.href = '/portal/notifications';
                onClose();
              }}
              className="w-full text-center text-sm text-accent-gold hover:text-accent-gold-light font-medium"
            >
              Ver todas as notificações
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;