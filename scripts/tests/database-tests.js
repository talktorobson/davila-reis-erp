// Database Connection and Data Tests
// Tests database connectivity and data integrity

const path = require('path')

// Helper to require modules from the main app
function requireFromApp(modulePath) {
  return require(path.join(process.cwd(), 'src', modulePath))
}

module.exports = [
  {
    name: 'Database Connection Test',
    async run() {
      try {
        const { testConnection } = requireFromApp('lib/database')
        const result = await testConnection()
        
        if (!result.success) {
          throw new Error(`Database connection failed: ${result.error}`)
        }
      } catch (error) {
        throw new Error(`Database test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Environment Variables Test',
    async run() {
      const { getDatabaseUrl } = requireFromApp('lib/env')
      
      const databaseUrl = getDatabaseUrl()
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set')
      }

      if (!databaseUrl.includes('postgresql://')) {
        throw new Error('DATABASE_URL should be a PostgreSQL connection string')
      }
    }
  },

  {
    name: 'Test User Data Exists',
    async run() {
      try {
        const { db } = requireFromApp('lib/database')
        const { clientPortalUsers } = requireFromApp('lib/schema')
        const { eq } = require('drizzle-orm')

        const testEmail = 'joao@empresateste.com.br'
        
        const user = await db
          .select()
          .from(clientPortalUsers)
          .where(eq(clientPortalUsers.email, testEmail))
          .limit(1)

        if (user.length === 0) {
          throw new Error(`Test user ${testEmail} not found in database`)
        }

        const userData = user[0]
        if (!userData.portal_access_enabled) {
          throw new Error('Test user does not have portal access enabled')
        }

        if (!userData.password_hash) {
          throw new Error('Test user missing password hash')
        }

        if (!userData.client_id) {
          throw new Error('Test user missing client_id')
        }

      } catch (error) {
        throw new Error(`Test user verification failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Test Client Data Exists',
    async run() {
      try {
        const { db } = requireFromApp('lib/database')
        const { clients, clientPortalUsers } = requireFromApp('lib/schema')
        const { eq } = require('drizzle-orm')

        const testEmail = 'joao@empresateste.com.br'
        
        // Get test user
        const user = await db
          .select()
          .from(clientPortalUsers)
          .where(eq(clientPortalUsers.email, testEmail))
          .limit(1)

        if (user.length === 0) {
          throw new Error('Test user not found')
        }

        // Get associated client
        const client = await db
          .select()
          .from(clients)
          .where(eq(clients.id, user[0].client_id))
          .limit(1)

        if (client.length === 0) {
          throw new Error('Test client not found')
        }

        const clientData = client[0]
        if (!clientData.company_name) {
          throw new Error('Test client missing company name')
        }

        if (!clientData.cnpj) {
          throw new Error('Test client missing CNPJ')
        }

        if (!clientData.contact_person) {
          throw new Error('Test client missing contact person')
        }

      } catch (error) {
        throw new Error(`Test client verification failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Test Cases Data Exists',
    async run() {
      try {
        const { db } = requireFromApp('lib/database')
        const { cases, clientPortalUsers } = requireFromApp('lib/schema')
        const { eq } = require('drizzle-orm')

        const testEmail = 'joao@empresateste.com.br'
        
        // Get test user
        const user = await db
          .select()
          .from(clientPortalUsers)
          .where(eq(clientPortalUsers.email, testEmail))
          .limit(1)

        if (user.length === 0) {
          throw new Error('Test user not found')
        }

        // Get cases for client
        const clientCases = await db
          .select()
          .from(cases)
          .where(eq(cases.client_id, user[0].client_id))

        if (clientCases.length === 0) {
          throw new Error('No test cases found for test client')
        }

        // Verify case structure
        const testCase = clientCases[0]
        const requiredFields = ['id', 'case_number', 'case_title', 'status', 'client_id']
        
        for (const field of requiredFields) {
          if (!testCase[field]) {
            throw new Error(`Case missing required field: ${field}`)
          }
        }

      } catch (error) {
        throw new Error(`Test cases verification failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Database Schema Validation',
    async run() {
      try {
        const { db } = requireFromApp('lib/database')
        
        // Test a simple query to validate schema
        const result = await db.execute(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('clients', 'client_portal_users', 'cases', 'documents', 'financial_records', 'messages')
        `)

        const tableNames = result.rows.map(row => row.table_name)
        const expectedTables = ['clients', 'client_portal_users', 'cases', 'documents', 'financial_records', 'messages']
        
        for (const table of expectedTables) {
          if (!tableNames.includes(table)) {
            throw new Error(`Required table '${table}' not found in database`)
          }
        }

      } catch (error) {
        throw new Error(`Schema validation failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Database Performance Test',
    async run() {
      try {
        const { db } = requireFromApp('lib/database')
        
        const startTime = Date.now()
        
        // Run a simple query to test performance
        await db.execute('SELECT NOW()')
        
        const endTime = Date.now()
        const queryTime = endTime - startTime
        
        // Query should complete in reasonable time (under 5 seconds)
        if (queryTime > 5000) {
          throw new Error(`Database query too slow: ${queryTime}ms`)
        }

      } catch (error) {
        throw new Error(`Database performance test failed: ${error.message}`)
      }
    }
  }
]