import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: 'admin' | 'client'
      client_id?: string
      company?: string
      cnpj?: string
      portal_user_id?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role?: 'admin' | 'client'
    client_id?: string
    company?: string
    cnpj?: string
    portal_user_id?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: 'admin' | 'client'
    client_id?: string
    company?: string
    cnpj?: string
    portal_user_id?: string
  }
}