"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import './portal-apple-redesign.css';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Set up modern portal styling
  useEffect(() => {
    // Set body styling for portal
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
    
    return () => {
      document.body.style.fontFamily = '';
    };
  }, []);

  useEffect(() => {
    // Always redirect to signin if not authenticated, regardless of loading state
    if (status === 'loading') {
      // Even while loading, if we're on portal route without session, redirect
      const timeoutId = setTimeout(() => {
        if (!session) {
          router.replace('/auth/signin?callbackUrl=/portal');
        }
      }, 1000); // Give 1 second for session to load
      
      return () => clearTimeout(timeoutId);
    }
    
    if (status === 'unauthenticated' || !session) {
      router.replace('/auth/signin?callbackUrl=/portal');
      return;
    }

    // Check if user has access to portal
    if (session.user && session.user.role !== 'client' && session.user.role !== 'admin') {
      router.replace('/auth/signin?error=AccessDenied');
      return;
    }
  }, [session, status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="apple-portal">
        <div className="apple-loading">
          <div className="apple-spinner" />
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Verificando acesso...
          </p>
        </div>
      </div>
    );
  }

  // Always redirect to login if no session
  if (status === 'unauthenticated' || !session) {
    // Immediate redirect using window.location as fallback
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin?callbackUrl=/portal';
    }
    return (
      <div className="apple-portal">
        <div className="apple-loading">
          <div className="apple-spinner" />
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Redirecionando para login...
          </p>
        </div>
      </div>
    );
  }

  // Don't render portal if user doesn't have access
  if (session.user && session.user.role !== 'client' && session.user.role !== 'admin') {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin?error=AccessDenied';
    }
    return (
      <div className="apple-portal">
        <div className="apple-loading">
          <div className="apple-spinner" />
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--apple-red)', fontSize: '14px' }}>
            Acesso negado. Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="apple-portal">
      {children}
    </div>
  );
}