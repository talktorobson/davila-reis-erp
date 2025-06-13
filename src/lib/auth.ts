// D'Avila Reis ERP - NextAuth Configuration

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { ClientsAPI } from './db-services'
import { getAuthConfig } from './env'
import type { User } from '@/types'

const authConfig = getAuthConfig()

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: authConfig.googleClientId,
      clientSecret: authConfig.googleClientSecret,
    }),
  ],
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  callbacks: {
    async signIn({ user, account, profile: _ }) {
      if (account?.provider === 'google') {
        try {
          // Check if user exists in clients table
          const clients = await ClientsAPI.search_clients(user.email || '')
          
          if (clients.length > 0) {
            // User is a client
            return true
          }

          // Check if user is admin (specific email addresses)
          const adminEmails = [
            'financeiro@davilareisadvogados.com.br',
            'financeiro@davilareisadvogados.com.br',
            // Add more admin emails as needed
          ]

          if (adminEmails.includes(user.email || '')) {
            return true
          }

          // User not found in system
          return false
        } catch (error) {
          console.error('Error checking user authorization:', error)
          return false
        }
      }
      
      return false
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        try {
          // Set user role and additional info
          const adminEmails = [
            'financeiro@davilareisadvogados.com.br',
            'financeiro@davilareisadvogados.com.br',
          ]

          if (adminEmails.includes(user.email || '')) {
            token.role = 'admin'
            token.client_id = undefined
            token.company = 'D\'avila Reis Advogados'
          } else {
            // Get client data
            const clients = await ClientsAPI.search_clients(user.email || '')
            
            if (clients.length > 0) {
              const client = clients[0]
              token.role = 'client'
              token.client_id = client.id
              token.company = client.company_name
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
      }

      return session
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: authConfig.nextAuthSecret,

  debug: process.env.NODE_ENV === 'development',
}

// Helper function to get user session on server side
export async function getCurrentUser(): Promise<User | null> {
  // This would be used in API routes to get the current user
  // Implementation depends on how you want to handle server-side auth
  return null
}

// Helper function to check if user is admin
export function isAdmin(user: User): boolean {
  return user.role === 'admin'
}

// Helper function to check if user is client
export function isClient(user: User): boolean {
  return user.role === 'client'
}

// Helper function to check if user can access client data
export function canAccessClient(user: User, clientId: string): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'client' && user.client_id === clientId) return true
  return false
}