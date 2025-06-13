// D'Avila Reis ERP - Portal Authentication API
// Handles client portal authentication using NextAuth with extended portal configuration

import NextAuth from 'next-auth'
import { authOptionsPortal } from '@/lib/auth-portal'

const handler = NextAuth(authOptionsPortal)

export { handler as GET, handler as POST }