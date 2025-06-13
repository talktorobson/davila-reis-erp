"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import ModernClientLayout from "@/components/portal/ModernClientLayout";
import MessageThread from '@/components/portal/MessageThread';
import { 
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_role: 'lawyer' | 'admin';
  last_message: {
    content: string;
    timestamp: string;
    sender_id: string;
    is_read: boolean;
  };
  case_id?: string;
  case_name?: string;
  unread_count: number;
  is_online?: boolean;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);

  const caseParam = searchParams.get('case');

  // Fetch real conversations from API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/portal/messages');
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();
        
        if (data.success && data.data?.threads) {
          // Transform API threads data to match component interface
          const transformedConversations: Conversation[] = data.data.threads.map((thread: any) => ({
            id: thread.thread_id,
            participant_id: 'lawyer-001', // Default lawyer ID
            participant_name: 'Dr. D\'avila Reis',
            participant_role: 'lawyer' as const,
            last_message: {
              content: thread.last_subject || 'Nova conversa',
              timestamp: thread.last_message,
              sender_id: 'lawyer-001',
              is_read: thread.unread_count === 0
            },
            case_id: thread.case_id,
            case_name: `Caso ${thread.case_id}`,
            unread_count: thread.unread_count,
            is_online: false
          }));

          setConversations(transformedConversations);

          // Auto-select conversation if case parameter is provided
          if (caseParam) {
            const caseConversation = transformedConversations.find(conv => conv.case_id === caseParam);
            if (caseConversation) {
              setSelectedConversation(caseConversation);
            }
          } else if (transformedConversations.length > 0) {
            setSelectedConversation(transformedConversations[0]);
          }
        } else {
          console.warn('No message threads found');
          setConversations([]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [caseParam]);

  const filteredConversations = conversations.filter(conv =>
    conv.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.case_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      return 'Agora';
    } else if (hours < 24) {
      return `${hours}h`;
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days}d`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const markAsRead = (conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unread_count: 0, last_message: { ...conv.last_message, is_read: true } }
          : conv
      )
    );
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (conversation.unread_count > 0) {
      markAsRead(conversation.id);
    }
  };

  if (isLoading) {
    return (
      <ModernClientLayout title="Mensagens">
        <div className="h-[calc(100vh-12rem)] flex">
          <div className="w-1/3 border-r border-gray-200">
            <div className="animate-pulse p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </ModernClientLayout>
    );
  }

  return (
    <ModernClientLayout title="Mensagens">
      <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Conversas</h3>
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="p-2 text-accent-gold hover:text-accent-gold-light rounded-full hover:bg-gray-100"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {searchTerm ? 'Tente usar termos diferentes.' : 'Inicie uma conversa com seu advogado.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleConversationSelect(conversation)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-2 border-accent-gold' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-accent-gold flex items-center justify-center">
                          <span className="text-primary-dark font-semibold text-sm">
                            {conversation.participant_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        {conversation.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-medium truncate ${
                            conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {conversation.participant_name}
                          </h4>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">
                              {formatTime(conversation.last_message.timestamp)}
                            </span>
                            {conversation.unread_count > 0 && (
                              <div className="w-5 h-5 bg-accent-gold text-white text-xs rounded-full flex items-center justify-center">
                                {conversation.unread_count}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {conversation.case_name && (
                          <p className="text-xs text-blue-600 mb-1 truncate">
                            {conversation.case_name}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate flex-1 ${
                            conversation.unread_count > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                          }`}>
                            {conversation.last_message.sender_id === session?.user?.id ? 'Você: ' : ''}
                            {conversation.last_message.content}
                          </p>
                          {conversation.last_message.sender_id === session?.user?.id && (
                            <div className="flex-shrink-0">
                              {conversation.last_message.is_read ? (
                                <CheckCircleIcon className="w-4 h-4 text-blue-500" />
                              ) : (
                                <ClockIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <MessageThread
              case_id={selectedConversation.case_id}
              recipient_name={selectedConversation.participant_name}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-gray-500">
                  Escolha uma conversa da lista para começar a trocar mensagens.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Conversa</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Advogado
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold">
                  <option value="">Escolha um advogado</option>
                  <option value="lawyer-456">Dr. D'avila Reis</option>
                  <option value="lawyer-789">Dra. Maria Santos</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caso (Opcional)
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold">
                  <option value="">Selecione um caso</option>
                  <option value="CASE-2024-001">Defesa Trabalhista - Funcionário Silva</option>
                  <option value="CASE-2024-002">Revisão Contratual - Prestadores de Serviço</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem Inicial
                </label>
                <textarea
                  rows={4}
                  placeholder="Digite sua mensagem..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Handle new conversation creation
                  setShowNewMessageModal(false);
                }}
                className="px-4 py-2 bg-accent-gold text-white rounded-lg hover:bg-accent-gold-light"
              >
                Iniciar Conversa
              </button>
            </div>
          </div>
        </div>
      )}
    </ModernClientLayout>
  );
}