"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
// import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    cnpj: '',
    password: ''
  });

  const errorParam = searchParams.get('error');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const formatCNPJ = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Apply CNPJ mask: XX.XXX.XXX/XXXX-XX
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData(prev => ({ ...prev, cnpj: formatted }));
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // For now, credentials authentication is not implemented
      // Show message directing users to Google OAuth
      setError('Autenticação por credenciais ainda não implementada. Use "Entrar com Google" para acessar o portal.');
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/portal';
      await signIn('google', { callbackUrl });
    } catch (err) {
      setError('Erro ao fazer login com Google. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        <div className="signin-header">
          {/* Logo - Simplified for portal */}
          <Link href="/" className="signin-logo">
            <div className="w-12 h-12 bg-accent-gold rounded-lg flex items-center justify-center">
              <span className="text-primary-dark font-bold text-lg">DR</span>
            </div>
            <div className="logo-text">
              <div className="logo-name">D&apos;avila Reis</div>
              <div className="logo-subtitle">Advogados</div>
            </div>
          </Link>

          <h2 className="signin-title">
            Portal do Cliente
          </h2>
          <p className="signin-subtitle">
            Acesse sua área exclusiva
          </p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <span>{error}</span>
          </div>
        )}

        {errorParam && (
          <div className="error-message" role="alert">
            <span>
              {errorParam === 'AccessDenied' && 'Acesso negado. Verifique se você tem permissão para acessar este sistema.'}
              {errorParam === 'Configuration' && 'Erro de configuração. Entre em contato com o suporte.'}
              {errorParam === 'Verification' && 'Erro de verificação. Tente novamente.'}
            </span>
          </div>
        )}

        <div className="signin-form-container">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="google-signin-btn"
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>

          <div className="divider">
            <div className="divider-line"></div>
            <span className="divider-text">ou</span>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsSignIn} className="signin-form">
            <div className="form-group">
              <label htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cnpj">
                CNPJ da Empresa
              </label>
              <input
                id="cnpj"
                name="cnpj"
                type="text"
                required
                value={formData.cnpj}
                onChange={handleCNPJChange}
                maxLength={18}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Senha
              </label>
              <div className="password-input">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? (
                    <span className="eye-icon">🙈</span>
                  ) : (
                    <span className="eye-icon">👁️</span>
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              <div className="remember-me">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                />
                <label htmlFor="remember-me">
                  Lembrar de mim
                </label>
              </div>

              <Link
                href="/auth/forgot-password"
                className="forgot-password"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="signin-submit-btn"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="signin-footer">
            <p>
              Não tem acesso ainda?{' '}
              <Link
                href="/contato"
                className="contact-link"
              >
                Entre em contato
              </Link>
            </p>
          </div>
        </div>

        <div className="back-to-site">
          <Link href="/">
            ← Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}