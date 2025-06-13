"use client";

import { ReactNode, useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ModernClientLayoutProps {
  children: ReactNode;
  title?: string;
}

const ModernClientLayout = ({ children, title = "Dashboard" }: ModernClientLayoutProps) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(3); // Mock notifications

  useEffect(() => {
    // Clean body styling
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/portal', 
      icon: HomeIcon,
      badge: null
    },
    { 
      name: 'Casos', 
      href: '/portal/cases', 
      icon: DocumentTextIcon,
      badge: null
    },
    { 
      name: 'Documentos', 
      href: '/portal/documents', 
      icon: DocumentTextIcon,
      badge: null
    },
    { 
      name: 'Mensagens', 
      href: '/portal/messages', 
      icon: ChatBubbleLeftRightIcon,
      badge: 2
    },
    { 
      name: 'Financeiro', 
      href: '/portal/financial', 
      icon: CreditCardIcon,
      badge: 1
    },
    { 
      name: 'Perfil', 
      href: '/portal/profile', 
      icon: UserCircleIcon,
      badge: null
    },
  ];

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="apple-portal">
      <div className="apple-portal-layout">
        {/* Mobile Overlay */}
        <div 
          className={`apple-mobile-overlay ${isSidebarOpen ? 'open' : ''}`}
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        <div className={`apple-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          {/* Logo Section */}
          <div className="apple-logo-section">
            <Link href="/portal" className="apple-logo" onClick={closeSidebar}>
              <div className="apple-logo-icon">
                DR
              </div>
              <div className="apple-logo-text">
                D'avila Reis
              </div>
            </Link>

            {/* User Profile */}
            <div className="apple-user-profile">
              <div className="apple-user-avatar">
                {session?.user?.name?.charAt(0) || 'U'}
              </div>
              <div className="apple-user-info">
                <h4>{session?.user?.name || 'Usuário'}</h4>
                <p>{session?.user?.company || 'Empresa'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="apple-nav">
            <div className="apple-nav-section">
              <div className="apple-nav-title">Menu Principal</div>
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`apple-nav-item ${isActive ? 'active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <Icon className="apple-nav-icon" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="apple-nav-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Sign Out */}
          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-light)' }}>
            <button
              onClick={handleSignOut}
              className="apple-button apple-button-text"
              style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--apple-red)' }}
            >
              <ArrowRightOnRectangleIcon className="apple-nav-icon" />
              Sair
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="apple-main">
          {/* Header */}
          <header className="apple-header">
            <div className="apple-header-left">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="apple-mobile-menu"
              >
                <Bars3Icon style={{ width: '20px', height: '20px' }} />
              </button>
              <div>
                <h1 className="apple-header-title">{title}</h1>
                {title !== 'Dashboard' && (
                  <p className="apple-header-subtitle">Gerencie e acompanhe seus {title.toLowerCase()}</p>
                )}
              </div>
            </div>

            <div className="apple-header-right">
              <button className="apple-icon-button" style={{ position: 'relative' }}>
                <BellIcon style={{ width: '20px', height: '20px' }} />
                {notifications > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    background: 'var(--apple-red)',
                    borderRadius: 'var(--radius-full)'
                  }} />
                )}
              </button>
              
              <div className="apple-user-avatar">
                {session?.user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="apple-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ModernClientLayout;