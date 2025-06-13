"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ModernClientLayout from "@/components/portal/ModernClientLayout";
import { 
  UserCircleIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilIcon,
  XMarkIcon,
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: {
    name: string;
    cnpj: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zip_code: string;
    };
    contact_person: string;
    industry: string;
    size: string;
  };
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    language: string;
    timezone: string;
  };
  security: {
    two_factor_enabled: boolean;
    last_password_change: string;
    last_login: string;
  };
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Mock profile data - in production, this would fetch from API
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockProfile: UserProfile = {
          id: session?.user?.id || 'user-123',
          name: session?.user?.name || 'João Silva',
          email: session?.user?.email || 'joao.silva@empresa.com.br',
          phone: '+55 11 99999-9999',
          company: {
            name: session?.user?.company || 'Silva & Associados Ltda',
            cnpj: '12.345.678/0001-90',
            address: {
              street: 'Rua das Empresas',
              number: '123',
              complement: 'Sala 45',
              neighborhood: 'Centro',
              city: 'São Paulo',
              state: 'SP',
              zip_code: '01234-567'
            },
            contact_person: 'João Silva',
            industry: 'Consultoria',
            size: '10-50 funcionários'
          },
          preferences: {
            notifications: {
              email: true,
              sms: false,
              push: true
            },
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo'
          },
          security: {
            two_factor_enabled: false,
            last_password_change: '2024-03-15T10:00:00Z',
            last_login: '2024-06-11T09:30:00Z'
          }
        };

        setProfile(mockProfile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '+55 $1 $2-$3');
    }
    return phone;
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

  const handleSaveSection = (section: string) => {
    // In production, this would save to API
    console.log(`Saving section: ${section}`);
    setEditingSection(null);
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('As senhas não coincidem');
      return;
    }

    // In production, this would make API call to change password
    console.log('Changing password...');
    setShowPasswordModal(false);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  const toggleNotification = (type: keyof UserProfile['preferences']['notifications']) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        notifications: {
          ...profile.preferences.notifications,
          [type]: !profile.preferences.notifications[type]
        }
      }
    });
  };

  const toggle2FA = () => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      security: {
        ...profile.security,
        two_factor_enabled: !profile.security.two_factor_enabled
      }
    });
  };

  if (isLoading) {
    return (
      <ModernClientLayout title="Meu Perfil">
        <div className="animate-pulse space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </ModernClientLayout>
    );
  }

  if (!profile) {
    return (
      <ModernClientLayout title="Meu Perfil">
        <div className="text-center py-12">
          <UserCircleIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erro ao carregar perfil
          </h3>
          <p className="text-gray-500">
            Não foi possível carregar os dados do seu perfil.
          </p>
        </div>
      </ModernClientLayout>
    );
  }

  return (
    <ModernClientLayout title="Meu Perfil">
      <div className="apple-grid apple-grid-cols-1">
        {/* Profile Header */}
        <div className="apple-card">
          <div className="apple-card-content">
            <div className="apple-flex apple-items-center" style={{ gap: 'var(--space-6)' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--apple-blue), var(--apple-purple))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '28px',
                fontWeight: 'var(--font-weight-bold)'
              }}>
                {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--text-primary)',
                  margin: '0 0 var(--space-2) 0'
                }}>{profile.name}</h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  margin: '0 0 var(--space-1) 0',
                  fontSize: '16px'
                }}>{profile.email}</p>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-tertiary)',
                  margin: '0'
                }}>
                  Último acesso: {formatDate(profile.security.last_login)}
                </p>
              </div>

              <button
                onClick={() => setEditingSection(editingSection === 'personal' ? null : 'personal')}
                className="apple-icon-button"
              >
                <PencilIcon style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="apple-card">
          <div className="apple-card-header">
            <div className="apple-flex apple-items-center apple-justify-between">
              <div>
                <h3 className="apple-card-title">Informações Pessoais</h3>
                <p className="apple-card-subtitle">Atualize seus dados pessoais</p>
              </div>
              <button
                onClick={() => setEditingSection(editingSection === 'personal' ? null : 'personal')}
                className="apple-icon-button"
              >
                {editingSection === 'personal' ? 
                  <XMarkIcon style={{ width: '20px', height: '20px' }} /> : 
                  <PencilIcon style={{ width: '20px', height: '20px' }} />
                }
              </button>
            </div>
          </div>

          <div className="apple-card-content">
            <div className="apple-grid apple-grid-cols-2" style={{ gap: 'var(--space-6)' }}>
              <div className="apple-form-group">
                <label className="apple-label">Nome Completo</label>
                {editingSection === 'personal' ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="apple-input"
                    placeholder="Digite seu nome completo"
                  />
                ) : (
                  <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}>{profile.name}</div>
                )}
              </div>

              <div className="apple-form-group">
                <label className="apple-label">E-mail</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}>
                  <EnvelopeIcon style={{ width: '16px', height: '16px', color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>{profile.email}</span>
                </div>
              </div>

              <div className="apple-form-group">
                <label className="apple-label">Telefone</label>
                {editingSection === 'personal' ? (
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="apple-input"
                    placeholder="(11) 99999-9999"
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}>
                    <PhoneIcon style={{ width: '16px', height: '16px', color: 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{formatPhone(profile.phone || '')}</span>
                  </div>
                )}
              </div>
            </div>

            {editingSection === 'personal' && (
              <div style={{ 
                marginTop: 'var(--space-6)', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 'var(--space-3)' 
              }}>
                <button
                  onClick={() => setEditingSection(null)}
                  className="apple-button apple-button-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveSection('personal')}
                  className="apple-button apple-button-primary"
                >
                  Salvar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Informações da Empresa</h3>
            <button
              onClick={() => setEditingSection(editingSection === 'company' ? null : 'company')}
              className="text-accent-gold hover:text-accent-gold-light"
            >
              {editingSection === 'company' ? <XMarkIcon className="w-5 h-5" /> : <PencilIcon className="w-5 h-5" />}
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{profile.company.name}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                <p className="text-gray-900">{formatCNPJ(profile.company.cnpj)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pessoa de Contato</label>
                {editingSection === 'company' ? (
                  <input
                    type="text"
                    value={profile.company.contact_person}
                    onChange={(e) => setProfile({
                      ...profile,
                      company: { ...profile.company, contact_person: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
                  />
                ) : (
                  <p className="text-gray-900">{profile.company.contact_person}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                {editingSection === 'company' ? (
                  <select
                    value={profile.company.industry}
                    onChange={(e) => setProfile({
                      ...profile,
                      company: { ...profile.company, industry: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
                  >
                    <option value="Consultoria">Consultoria</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Manufatura">Manufatura</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Comércio">Comércio</option>
                    <option value="Outros">Outros</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{profile.company.industry}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Porte da Empresa</label>
                {editingSection === 'company' ? (
                  <select
                    value={profile.company.size}
                    onChange={(e) => setProfile({
                      ...profile,
                      company: { ...profile.company, size: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
                  >
                    <option value="1-10 funcionários">1-10 funcionários</option>
                    <option value="10-50 funcionários">10-50 funcionários</option>
                    <option value="50-200 funcionários">50-200 funcionários</option>
                    <option value="200+ funcionários">200+ funcionários</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{profile.company.size}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <div className="flex items-start gap-2">
                  <MapPinIcon className="w-4 h-4 text-gray-400 mt-1" />
                  <div className="text-gray-900">
                    <p>{profile.company.address.street}, {profile.company.address.number}</p>
                    {profile.company.address.complement && <p>{profile.company.address.complement}</p>}
                    <p>{profile.company.address.neighborhood} - {profile.company.address.city}/{profile.company.address.state}</p>
                    <p>CEP: {profile.company.address.zip_code}</p>
                  </div>
                </div>
              </div>
            </div>

            {editingSection === 'company' && (
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveSection('company')}
                  className="px-4 py-2 bg-accent-gold text-white rounded-lg hover:bg-accent-gold-light"
                >
                  Salvar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Preferências</h3>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <BellIcon className="w-5 h-5" />
                Notificações
              </h4>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">E-mail</span>
                  <input
                    type="checkbox"
                    checked={profile.preferences.notifications.email}
                    onChange={() => toggleNotification('email')}
                    className="rounded border-gray-300 text-accent-gold focus:ring-accent-gold"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">SMS</span>
                  <input
                    type="checkbox"
                    checked={profile.preferences.notifications.sms}
                    onChange={() => toggleNotification('sms')}
                    className="rounded border-gray-300 text-accent-gold focus:ring-accent-gold"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Push (Navegador)</span>
                  <input
                    type="checkbox"
                    checked={profile.preferences.notifications.push}
                    onChange={() => toggleNotification('push')}
                    className="rounded border-gray-300 text-accent-gold focus:ring-accent-gold"
                  />
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Idioma e Região</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold">
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuso Horário</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold">
                    <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                    <option value="America/New_York">New York (UTC-5)</option>
                    <option value="Europe/London">Londres (UTC+0)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              Segurança
            </h3>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Alterar Senha</h4>
                <p className="text-sm text-gray-600">
                  Última alteração: {formatDate(profile.security.last_password_change)}
                </p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <KeyIcon className="w-4 h-4" />
                Alterar
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Autenticação de Dois Fatores</h4>
                <p className="text-sm text-gray-600">
                  {profile.security.two_factor_enabled 
                    ? 'Proteção adicional ativada'
                    : 'Adicione uma camada extra de segurança'
                  }
                </p>
              </div>
              <button
                onClick={toggle2FA}
                className={`px-4 py-2 rounded-lg font-medium ${
                  profile.security.two_factor_enabled
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {profile.security.two_factor_enabled ? 'Ativado' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alterar Senha</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.current ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.new ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-accent-gold focus:border-accent-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.confirm ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePasswordChange}
                  className="px-4 py-2 bg-accent-gold text-white rounded-lg hover:bg-accent-gold-light"
                >
                  Alterar Senha
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernClientLayout>
  );
}