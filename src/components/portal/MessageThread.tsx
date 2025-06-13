"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PaperAirplaneIcon,
  PaperClipIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  DocumentIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'client' | 'lawyer' | 'admin';
  timestamp: string;
  read_at?: string;
  attachments?: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
  reply_to?: string;
  is_edited?: boolean;
  edited_at?: string;
}

interface MessageThreadProps {
  case_id?: string;
  recipient_name?: string;
  onClose?: () => void;
}

const MessageThread = ({ case_id, recipient_name, onClose }: MessageThreadProps) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [isTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch real messages from API
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (case_id) params.append('caseId', case_id);
        
        const response = await fetch(`/api/portal/messages?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();
        
        if (data.success && data.data?.messages) {
          // Transform API messages to match component interface
          const transformedMessages: Message[] = data.data.messages.map((apiMsg: any) => ({
            id: apiMsg.id,
            content: apiMsg.message,
            sender_id: apiMsg.sender_id,
            sender_name: getSenderName(apiMsg.sender_type, apiMsg.sender_id),
            sender_role: apiMsg.sender_type,
            timestamp: apiMsg.created_at,
            read_at: apiMsg.read_at,
            attachments: apiMsg.attachments || [],
            reply_to: apiMsg.parent_message_id
          }));

          setMessages(transformedMessages);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [case_id, session]);

  // Helper function to get sender name based on type and ID
  const getSenderName = (senderType: string, senderId: string) => {
    if (senderType === 'client') {
      return session?.user?.name || 'Cliente';
    } else if (senderType === 'lawyer') {
      return 'Dr. D\'avila Reis';
    } else if (senderType === 'staff') {
      return 'Equipe';
    }
    return 'Sistema';
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    setIsSending(true);
    try {
      // Send message via API
      const response = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          caseId: case_id,
          subject: replyingTo ? undefined : 'Nova mensagem',
          parentMessageId: replyingTo?.id,
          priority: 'Medium',
          recipientType: 'lawyer'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (data.success) {
        // Create optimistic message for immediate UI update
        const newMsg: Message = {
          id: data.data.id,
          content: newMessage.trim(),
          sender_id: session?.user?.id || 'current-user',
          sender_name: session?.user?.name || 'Você',
          sender_role: 'client',
          timestamp: data.data.createdAt,
          reply_to: replyingTo?.id,
          attachments: [] // TODO: Handle file uploads
        };

        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setAttachments([]);
        setReplyingTo(null);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 5 - attachments.length);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isCurrentUser = (sender_id: string) => {
    return sender_id === session?.user?.id || sender_id === 'current-user';
  };

  const getMessageStatus = (message: Message) => {
    if (isCurrentUser(message.sender_id)) {
      if (message.read_at) {
        return <CheckIcon className="w-4 h-4 text-blue-500" />;
      } else {
        return <CheckIcon className="w-4 h-4 text-gray-400" />;
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-gold flex items-center justify-center">
            <span className="text-primary-dark font-semibold text-sm">
              {recipient_name?.charAt(0) || 'DR'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {recipient_name || 'Dr. D\'avila Reis'}
            </h3>
            {case_id && (
              <p className="text-sm text-gray-500">Caso: {case_id}</p>
            )}
            {isTyping && (
              <p className="text-xs text-green-600">Digitando...</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = isCurrentUser(message.sender_id);
          
          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                {/* Reply indicator */}
                {message.reply_to && (
                  <div className="text-xs text-gray-500 mb-1 pl-3">
                    Respondendo a uma mensagem anterior
                  </div>
                )}
                
                <div className={`rounded-2xl px-4 py-2 ${
                  isOwn 
                    ? 'bg-accent-gold text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {!isOwn && (
                    <p className="text-xs font-medium mb-1 text-gray-600">
                      {message.sender_name}
                    </p>
                  )}
                  
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            isOwn ? 'bg-white/20' : 'bg-white'
                          }`}
                        >
                          <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.name}</p>
                            <p className="text-xs opacity-75">{formatFileSize(attachment.size)}</p>
                          </div>
                          <button className="text-xs underline hover:no-underline">
                            Baixar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    isOwn ? 'text-white/75' : 'text-gray-500'
                  }`}>
                    <span>{formatTime(message.timestamp)}</span>
                    {isOwn && (
                      <div className="flex items-center gap-1">
                        {message.is_edited && <span>editado</span>}
                        {getMessageStatus(message)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {!isOwn && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center ml-2 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600">
                    {message.sender_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-8 bg-accent-gold rounded-full"></div>
              <div>
                <p className="text-xs font-medium text-gray-700">
                  Respondendo a {replyingTo.sender_name}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-xs">
                  {replyingTo.content}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                <DocumentIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold max-h-32"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setShowAttachmentOptions(!showAttachmentOptions)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <PaperClipIcon className="w-5 h-5" />
              </button>
              
              {showAttachmentOptions && (
                <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[150px]">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachmentOptions(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                  >
                    <DocumentIcon className="w-4 h-4" />
                    Arquivo
                  </button>
                  <button
                    onClick={() => {
                      // In production, this would open image picker
                      fileInputRef.current?.click();
                      setShowAttachmentOptions(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    Imagem
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={isSending || (!newMessage.trim() && attachments.length === 0)}
              className="p-2 bg-accent-gold text-white rounded-full hover:bg-accent-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default MessageThread;