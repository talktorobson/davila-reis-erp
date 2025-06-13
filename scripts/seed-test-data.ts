// Test data seeding script for Phase 3 development

import { db } from '../src/lib/database'
import { clients, cases, documents, financial_records, tasks, staff } from '../src/lib/schema'

async function seedTestData() {
  console.log('🌱 Seeding test data for Phase 3...')

  try {
    // Clear existing data
    await db.delete(financial_records)
    await db.delete(documents)
    await db.delete(tasks)
    await db.delete(cases)
    await db.delete(clients)
    await db.delete(staff)

    // Insert staff member
    const [lawyer] = await db.insert(staff).values({
      name: 'Dr. D\'avila Reis',
      email: 'davila@davilareisadvogados.com.br',
      role: 'Partner',
      phone: '(15) 3384-4013',
      specialties: ['Direito Trabalhista', 'Direito Empresarial'],
      active: true
    }).returning()

    // Insert test client
    const [client] = await db.insert(clients).values({
      company_name: 'Empresa Teste Ltda',
      contact_name: 'João Silva',
      email: 'joao@empresateste.com.br',
      phone: '(11) 99999-9999',
      address: 'Rua das Empresas, 123',
      city: 'São Paulo',
      state: 'SP',
      postal_code: '01234-567',
      status: 'Active',
      industry: 'Tecnologia',
      company_size: 50,
      assigned_lawyer: lawyer.id
    }).returning()

    // Insert test cases
    const testCases = await db.insert(cases).values([
      {
        client_id: client.id,
        case_number: '2024-001',
        title: 'Processo Trabalhista - Reclamação',
        description: 'Defesa em processo trabalhista movido por ex-funcionário',
        status: 'In Progress',
        priority: 'High',
        assigned_lawyer: lawyer.id,
        court: 'TRT 15ª Região - Campinas',
        next_hearing: new Date('2025-07-15'),
        estimated_completion: new Date('2025-12-31'),
        value_involved: '125000.00'
      },
      {
        client_id: client.id,
        case_number: '2024-002',
        title: 'Consultoria Preventiva - Compliance',
        description: 'Implementação de compliance trabalhista na empresa',
        status: 'Open',
        priority: 'Medium',
        assigned_lawyer: lawyer.id,
        estimated_completion: new Date('2025-08-30'),
        value_involved: '45000.00'
      },
      {
        client_id: client.id,
        case_number: '2023-015',
        title: 'Acordo Coletivo de Trabalho',
        description: 'Negociação e elaboração de ACT com sindicato',
        status: 'Closed - Won',
        priority: 'Medium',
        assigned_lawyer: lawyer.id,
        completion_date: new Date('2024-12-15'),
        value_involved: '75000.00'
      }
    ]).returning()

    // Insert test documents
    await db.insert(documents).values([
      {
        case_id: testCases[0].id,
        title: 'Petição Inicial de Defesa',
        filename: 'peticao_inicial_defesa.pdf',
        file_path: '/documents/case-2024-001/peticao_inicial_defesa.pdf',
        file_size: 2456789,
        mime_type: 'application/pdf',
        status: 'Approved',
        category: 'Petições',
        uploaded_by: lawyer.id
      },
      {
        case_id: testCases[0].id,
        title: 'Documentos Comprobatórios',
        filename: 'documentos_comprob.pdf',
        file_path: '/documents/case-2024-001/documentos_comprob.pdf',
        file_size: 1234567,
        mime_type: 'application/pdf',
        status: 'Approved',
        category: 'Provas',
        uploaded_by: lawyer.id
      },
      {
        case_id: testCases[1].id,
        title: 'Manual de Compliance',
        filename: 'manual_compliance.pdf',
        file_path: '/documents/case-2024-002/manual_compliance.pdf',
        file_size: 3456789,
        mime_type: 'application/pdf',
        status: 'Draft',
        category: 'Manuais',
        uploaded_by: lawyer.id
      }
    ])

    // Insert test financial records
    await db.insert(financial_records).values([
      {
        client_id: client.id,
        case_id: testCases[0].id,
        type: 'Invoice',
        description: 'Honorários advocatícios - Processo 2024-001',
        amount: '25000.00',
        status: 'Paid',
        due_date: new Date('2025-01-15'),
        payment_date: new Date('2025-01-10'),
        reference_number: 'INV-2025-001'
      },
      {
        client_id: client.id,
        case_id: testCases[1].id,
        type: 'Invoice',
        description: 'Consultoria Compliance - 1ª Parcela',
        amount: '15000.00',
        status: 'Pending',
        due_date: new Date('2025-07-01'),
        reference_number: 'INV-2025-002'
      },
      {
        client_id: client.id,
        type: 'Receivable',
        description: 'Honorários de êxito - Processo 2023-015',
        amount: '50000.00',
        status: 'Paid',
        due_date: new Date('2025-01-01'),
        payment_date: new Date('2024-12-28'),
        reference_number: 'REC-2024-015'
      }
    ])

    // Insert test tasks
    await db.insert(tasks).values([
      {
        case_id: testCases[0].id,
        assigned_to: lawyer.id,
        title: 'Preparar impugnação',
        description: 'Elaborar impugnação à inicial da reclamação trabalhista',
        priority: 'High',
        status: 'In Progress',
        due_date: new Date('2025-06-20')
      },
      {
        case_id: testCases[0].id,
        assigned_to: lawyer.id,
        title: 'Audiência de conciliação',
        description: 'Comparecer à audiência de conciliação no TRT',
        priority: 'High',
        status: 'Pending',
        due_date: new Date('2025-07-15')
      },
      {
        case_id: testCases[1].id,
        assigned_to: lawyer.id,
        title: 'Revisar políticas internas',
        description: 'Revisar e atualizar políticas de RH da empresa',
        priority: 'Medium',
        status: 'Pending',
        due_date: new Date('2025-06-30')
      }
    ])

    console.log('✅ Test data seeded successfully!')
    console.log(`   Client: ${client.company_name}`)
    console.log(`   Cases: ${testCases.length}`)
    console.log(`   Email for testing: ${client.email}`)
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { seedTestData }