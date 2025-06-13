// D'Avila Reis ERP - Client Portal Authentication
// Extended authentication system for client portal with credentials provider

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { db } from './database'
import { clientPortalUsers, clients } from './schema'
import { eq, and } from 'drizzle-orm'
import type { User } from '@/types'

// CNPJ validation utility
export function validateCNPJ(cnpj: string): boolean {
  // Remove non-numeric characters
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
  
  // Check if has 14 digits and isn't all same digits
  if (cleanCNPJ.length !== 14 || /^(\d)\1+$/.test(cleanCNPJ)) {
    return false
  }

  // Calculate first verification digit
  let sum = 0
  let weight = 5
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  
  if (firstDigit !== parseInt(cleanCNPJ[12])) {
    return false
  }

  // Calculate second verification digit
  sum = 0
  weight = 6
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  
  return secondDigit === parseInt(cleanCNPJ[13])
}

// Format CNPJ for display
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/[^\d]/g, '')
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>()

function checkLoginRateLimit(identifier: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const current = loginAttempts.get(identifier)
  
  if (!current || now > current.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= maxAttempts) {
    return false
  }

  current.count++
  return true
}

export const authOptionsPortal: NextAuthOptions = {
  providers: [
    // Credentials provider for client portal login
    CredentialsProvider({
      id: 'client-credentials',
      name: 'Client Portal',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email', 
          placeholder: 'cliente@empresa.com.br' 
        },
        password: { 
          label: 'Senha', 
          type: 'password' 
        },
        cnpj: { 
          label: 'CNPJ', 
          type: 'text', 
          placeholder: '00.000.000/0000-00' 
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        // Rate limiting
        const identifier = credentials.email.toLowerCase()
        if (!checkLoginRateLimit(identifier)) {
          throw new Error('Muitas tentativas de login. Tente novamente em 15 minutos.')
        }

        try {
          // Find portal user
          const [portalUser] = await db
            .select()
            .from(clientPortalUsers)
            .where(eq(clientPortalUsers.email, identifier))
            .limit(1)

          if (!portalUser) {
            throw new Error('Credenciais inválidas')
          }

          // Check if account is locked
          if (portalUser.locked_until && new Date() < portalUser.locked_until) {
            throw new Error('Conta temporariamente bloqueada. Tente novamente mais tarde.')
          }

          // Check if portal access is enabled
          if (!portalUser.portal_access_enabled) {
            throw new Error('Acesso ao portal desabilitado. Entre em contato com nosso escritório.')
          }

          // Verify password
          const isPasswordValid = await compare(credentials.password, portalUser.password_hash)
          
          if (!isPasswordValid) {
            // Increment failed attempts
            const newFailedAttempts = (portalUser.failed_login_attempts || 0) + 1
            const shouldLock = newFailedAttempts >= 5
            
            await db
              .update(clientPortalUsers)
              .set({
                failed_login_attempts: newFailedAttempts,
                locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null, // 30 minutes
                updated_at: new Date()
              })
              .where(eq(clientPortalUsers.id, portalUser.id))

            throw new Error('Credenciais inválidas')
          }

          // Get client data
          const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.id, portalUser.client_id))
            .limit(1)

          if (!client) {
            throw new Error('Cliente não encontrado')
          }

          // Validate CNPJ if provided
          if (credentials.cnpj) {
            const cleanProvidedCNPJ = credentials.cnpj.replace(/[^\d]/g, '')
            const cleanClientCNPJ = client.cnpj?.replace(/[^\d]/g, '')
            
            if (cleanClientCNPJ && cleanProvidedCNPJ !== cleanClientCNPJ) {
              throw new Error('CNPJ não confere com os dados cadastrados')
            }
          }

          // Reset failed attempts and update last login
          await db
            .update(clientPortalUsers)
            .set({
              failed_login_attempts: 0,
              locked_until: null,
              last_login: new Date(),
              updated_at: new Date()
            })
            .where(eq(clientPortalUsers.id, portalUser.id))

          // Return user object for NextAuth
          return {
            id: portalUser.id,
            email: portalUser.email,
            name: client.contact_person,
            role: 'client' as const,
            client_id: client.id,
            company: client.company_name,
            cnpj: client.cnpj || undefined,
            portal_user_id: portalUser.id
          }

        } catch (error) {
          console.error('Portal authentication error:', error)
          throw error instanceof Error ? error : new Error('Erro interno de autenticação')
        }
      }
    }),

    // Google OAuth for existing admin authentication
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  pages: {
    signIn: '/portal/login',
    error: '/portal/error',
    signOut: '/portal/logout'
  },

  callbacks: {
    async signIn({ user, account, profile: _ }) {
      // Handle Google OAuth (admin access)
      if (account?.provider === 'google') {
        try {
          // Check if user is admin
          const adminEmails = [
            'financeiro@davilareisadvogados.com.br',
            'financeiro@davilareisadvogados.com.br',
          ]

          if (adminEmails.includes(user.email || '')) {
            return true
          }

          // Check if user exists in clients table for portal access
          const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.email, user.email || ''))
            .limit(1)

          if (client && client.portal_access) {
            // Check if portal user exists
            const [portalUser] = await db
              .select()
              .from(clientPortalUsers)
              .where(and(
                eq(clientPortalUsers.client_id, client.id),
                eq(clientPortalUsers.email, user.email || '')
              ))
              .limit(1)

            if (portalUser && portalUser.portal_access_enabled) {
              return true
            }
          }

          return false
        } catch (error) {
          console.error('Error checking user authorization:', error)
          return false
        }
      }

      // Handle credentials provider (client portal)
      if (account?.provider === 'client-credentials') {
        return true // Authorization is handled in the authorize function
      }
      
      return false
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        try {
          // Admin authentication
          const adminEmails = [
            'financeiro@davilareisadvogados.com.br',
            'financeiro@davilareisadvogados.com.br',
          ]

          if (adminEmails.includes(user.email || '')) {
            token.role = 'admin'
            token.client_id = undefined
            token.company = 'D\'avila Reis Advogados'
            token.portal_user_id = undefined
          } else if (account.provider === 'client-credentials') {
            // Client portal authentication
            token.role = user.role
            token.client_id = user.client_id
            token.company = user.company
            token.cnpj = user.cnpj
            token.portal_user_id = user.portal_user_id
          } else if (account.provider === 'google') {
            // Google OAuth for client
            const [client] = await db
              .select()
              .from(clients)
              .where(eq(clients.email, user.email || ''))
              .limit(1)
            
            if (client) {
              const [portalUser] = await db
                .select()
                .from(clientPortalUsers)
                .where(and(
                  eq(clientPortalUsers.client_id, client.id),
                  eq(clientPortalUsers.email, user.email || '')
                ))
                .limit(1)

              token.role = 'client'
              token.client_id = client.id
              token.company = client.company_name
              token.cnpj = client.cnpj || undefined
              token.portal_user_id = portalUser?.id || undefined
            }
          }
        } catch (error) {
          console.error('Error setting user role:', error)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.role = token.role as 'admin' | 'client'
        session.user.client_id = token.client_id as string | undefined
        session.user.company = token.company as string | undefined
        session.user.cnpj = token.cnpj as string | undefined
        session.user.portal_user_id = token.portal_user_id as string | undefined
      }

      return session
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours for portal sessions
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

// Helper functions for RBAC
export const PortalPermissions = {
  'client': [
    'view_own_cases',
    'download_own_documents',
    'upload_documents',
    'send_messages',
    'view_own_invoices',
    'update_own_profile',
    'view_notifications',
    'book_appointments'
  ],
  'lawyer': [
    'view_assigned_cases',
    'view_client_cases',
    'upload_documents',
    'update_case_status',
    'send_messages_to_clients',
    'view_client_communications',
    'create_notifications'
  ],
  'admin': [
    'view_all_cases',
    'manage_users',
    'view_all_communications',
    'system_administration',
    'view_analytics',
    'manage_portal_access'
  ]
}

export function hasPermission(userRole: string, permission: string): boolean {
  const permissions = PortalPermissions[userRole as keyof typeof PortalPermissions]
  return permissions?.includes(permission) || false
}

export function canAccessClient(user: User, clientId: string): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'client' && user.client_id === clientId) return true
  return false
}

export function canAccessCase(user: User, caseClientId: string): boolean {
  return canAccessClient(user, caseClientId)
}

export function canAccessDocument(user: User, documentClientId: string): boolean {
  return canAccessClient(user, documentClientId)
}