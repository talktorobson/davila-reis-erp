// D'Avila Reis ERP - Portal Profile API
// User profile management with security and audit logging

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptionsPortal, formatCNPJ } from '@/lib/auth-portal'
import { db } from '@/lib/database'
import { clients, clientPortalUsers } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { hash, compare } from 'bcryptjs'
import { logger } from '@/lib/logger'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsPortal)
    
    if (!session?.user?.client_id || !session?.user?.portal_user_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    // Fetch client and portal user data
    const [profileData] = await db
      .select({
        // Client information
        client_id: clients.id,
        company_name: clients.company_name,
        cnpj: clients.cnpj,
        contact_person: clients.contact_person,
        position: clients.position,
        email: clients.email,
        phone: clients.phone,
        address: clients.address,
        region: clients.region,
        company_size: clients.company_size,
        industry: clients.industry,
        client_since: clients.client_since,
        status: clients.status,
        primary_lawyer: clients.primary_lawyer,
        services_contracted: clients.services_contracted,
        payment_terms: clients.payment_terms,
        portal_access: clients.portal_access,
        client_rating: clients.client_rating,
        // Portal user information
        portal_user_id: clientPortalUsers.id,
        portal_email: clientPortalUsers.email,
        last_login: clientPortalUsers.last_login,
        email_verified: clientPortalUsers.email_verified,
        portal_access_enabled: clientPortalUsers.portal_access_enabled,
        created_at: clientPortalUsers.created_at
      })
      .from(clients)
      .innerJoin(clientPortalUsers, eq(clients.id, clientPortalUsers.client_id))
      .where(and(
        eq(clients.id, session.user.client_id),
        eq(clientPortalUsers.id, session.user.portal_user_id)
      ))

    if (!profileData) {
      return NextResponse.json(
        { success: false, error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    // Format CNPJ for display
    const formattedCNPJ = profileData.cnpj ? formatCNPJ(profileData.cnpj) : null

    logger.info('Profile data fetched successfully', {
      clientId: session.user.client_id,
      userId: session.user.id,
      portalUserId: profileData.portal_user_id
    })

    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: profileData.client_id,
          companyName: profileData.company_name,
          cnpj: formattedCNPJ,
          contactPerson: profileData.contact_person,
          position: profileData.position,
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address,
          region: profileData.region,
          companySize: profileData.company_size,
          industry: profileData.industry,
          clientSince: profileData.client_since,
          status: profileData.status,
          primaryLawyer: profileData.primary_lawyer,
          servicesContracted: profileData.services_contracted,
          paymentTerms: profileData.payment_terms,
          clientRating: profileData.client_rating
        },
        portalUser: {
          id: profileData.portal_user_id,
          email: profileData.portal_email,
          lastLogin: profileData.last_login,
          emailVerified: profileData.email_verified,
          portalAccessEnabled: profileData.portal_access_enabled,
          memberSince: profileData.created_at
        },
        meta: {
          canEditCompanyInfo: false, // Company info should be changed through firm
          canEditContactInfo: true,
          canChangePassword: true,
          requiresEmailVerification: !profileData.email_verified
        }
      },
      fetchedAt: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Error fetching profile data', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptionsPortal)
    
    if (!session?.user?.client_id || !session?.user?.portal_user_id) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      contactPerson,
      position,
      phone,
      address,
      currentPassword,
      newPassword,
      confirmPassword
    } = body

    // Validate password change if requested
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Senha atual é obrigatória para alterar a senha' },
          { status: 400 }
        )
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'Nova senha e confirmação não conferem' },
          { status: 400 }
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Nova senha deve ter pelo menos 8 caracteres' },
          { status: 400 }
        )
      }

      // Verify current password
      const [portalUser] = await db
        .select({ password_hash: clientPortalUsers.password_hash })
        .from(clientPortalUsers)
        .where(eq(clientPortalUsers.id, session.user.portal_user_id))

      if (!portalUser) {
        return NextResponse.json(
          { success: false, error: 'Usuário não encontrado' },
          { status: 404 }
        )
      }

      const isCurrentPasswordValid = await compare(currentPassword, portalUser.password_hash)
      if (!isCurrentPasswordValid) {
        logger.warn('Invalid current password provided for profile update', {
          userId: session.user.id,
          clientId: session.user.client_id
        })

        return NextResponse.json(
          { success: false, error: 'Senha atual incorreta' },
          { status: 400 }
        )
      }

      // Hash new password
      const newPasswordHash = await hash(newPassword, 12)

      // Update password
      await db
        .update(clientPortalUsers)
        .set({
          password_hash: newPasswordHash,
          updated_at: new Date()
        })
        .where(eq(clientPortalUsers.id, session.user.portal_user_id))

      logger.info('Password changed successfully', {
        userId: session.user.id,
        clientId: session.user.client_id,
        portalUserId: session.user.portal_user_id
      })
    }

    // Update client contact information
    const clientUpdates: Partial<typeof clients.$inferInsert> = { updated_at: new Date() }
    
    if (contactPerson !== undefined) clientUpdates.contact_person = contactPerson
    if (position !== undefined) clientUpdates.position = position
    if (phone !== undefined) clientUpdates.phone = phone
    if (address !== undefined) clientUpdates.address = address

    if (Object.keys(clientUpdates).length > 1) { // More than just updated_at
      await db
        .update(clients)
        .set(clientUpdates)
        .where(eq(clients.id, session.user.client_id))

      logger.info('Profile updated successfully', {
        userId: session.user.id,
        clientId: session.user.client_id,
        updatedFields: Object.keys(clientUpdates).filter(key => key !== 'updated_at')
      })
    }

    return NextResponse.json({
      success: true,
      message: newPassword 
        ? 'Perfil e senha atualizados com sucesso'
        : 'Perfil atualizado com sucesso',
      data: {
        updated: true,
        passwordChanged: !!newPassword,
        updatedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    logger.error('Error updating profile', error as Error)

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}