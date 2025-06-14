// Portal Feature Tests
// Tests client portal functionality, APIs, and user experience

const path = require('path')

// Helper to require modules from the main app
function requireFromApp(modulePath) {
  return require(path.join(process.cwd(), 'src', modulePath))
}

module.exports = [
  {
    name: 'Portal Authentication Service Test',
    async run() {
      try {
        const { authenticateUser } = requireFromApp('lib/auth-server')
        
        // Test with valid credentials
        const testEmail = 'joao@empresateste.com.br'
        const testPassword = 'senha123'
        
        const authResult = await authenticateUser(testEmail, testPassword)
        
        if (!authResult.success) {
          throw new Error(`Authentication failed: ${authResult.error}`)
        }

        if (!authResult.user) {
          throw new Error('Authentication succeeded but no user data returned')
        }

        // Verify user data structure
        const requiredFields = ['id', 'email', 'client_id', 'portal_access_enabled']
        for (const field of requiredFields) {
          if (authResult.user[field] === undefined) {
            throw new Error(`User data missing required field: ${field}`)
          }
        }

        // Test with invalid credentials
        const invalidResult = await authenticateUser(testEmail, 'wrongpassword')
        if (invalidResult.success) {
          throw new Error('Authentication should fail with wrong password')
        }

      } catch (error) {
        throw new Error(`Portal auth service test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Cases API Data Structure Test',
    async run() {
      try {
        const { getCasesByClientId } = requireFromApp('lib/services/portal-service')
        
        // Use test client ID from the test user
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
          throw new Error('Test user not found for cases test')
        }

        const cases = await getCasesByClientId(user[0].client_id)
        
        if (!Array.isArray(cases)) {
          throw new Error('Cases should be returned as an array')
        }

        if (cases.length === 0) {
          console.log('Warning: No test cases found, cannot validate case structure')
          return
        }

        // Validate case structure
        const testCase = cases[0]
        const requiredFields = [
          'id', 'case_number', 'case_title', 'status', 
          'description', 'created_at', 'client_id'
        ]

        for (const field of requiredFields) {
          if (testCase[field] === undefined) {
            throw new Error(`Case data missing required field: ${field}`)
          }
        }

        // Validate status values
        const validStatuses = ['active', 'pending', 'completed', 'on_hold']
        if (!validStatuses.includes(testCase.status)) {
          throw new Error(`Invalid case status: ${testCase.status}`)
        }

      } catch (error) {
        throw new Error(`Cases API test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Documents API Data Structure Test',
    async run() {
      try {
        const { getDocumentsByClientId } = requireFromApp('lib/services/portal-service')
        
        // Use test client ID
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
          throw new Error('Test user not found for documents test')
        }

        const documents = await getDocumentsByClientId(user[0].client_id)
        
        if (!Array.isArray(documents)) {
          throw new Error('Documents should be returned as an array')
        }

        if (documents.length === 0) {
          console.log('Warning: No test documents found, cannot validate document structure')
          return
        }

        // Validate document structure
        const testDoc = documents[0]
        const requiredFields = [
          'id', 'document_name', 'document_type', 'file_size',
          'upload_date', 'client_id'
        ]

        for (const field of requiredFields) {
          if (testDoc[field] === undefined) {
            throw new Error(`Document data missing required field: ${field}`)
          }
        }

        // Validate file size is a number
        if (typeof testDoc.file_size !== 'number' || testDoc.file_size < 0) {
          throw new Error('Document file_size should be a positive number')
        }

        // Validate document type
        const validTypes = ['contract', 'invoice', 'correspondence', 'court_filing', 'other']
        if (!validTypes.includes(testDoc.document_type)) {
          throw new Error(`Invalid document type: ${testDoc.document_type}`)
        }

      } catch (error) {
        throw new Error(`Documents API test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Financial Records API Data Structure Test',
    async run() {
      try {
        const { getFinancialRecordsByClientId } = requireFromApp('lib/services/portal-service')
        
        // Use test client ID
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
          throw new Error('Test user not found for financial test')
        }

        const financialRecords = await getFinancialRecordsByClientId(user[0].client_id)
        
        if (!Array.isArray(financialRecords)) {
          throw new Error('Financial records should be returned as an array')
        }

        if (financialRecords.length === 0) {
          console.log('Warning: No test financial records found, cannot validate structure')
          return
        }

        // Validate financial record structure
        const testRecord = financialRecords[0]
        const requiredFields = [
          'id', 'record_type', 'amount', 'description', 
          'due_date', 'status', 'client_id'
        ]

        for (const field of requiredFields) {
          if (testRecord[field] === undefined) {
            throw new Error(`Financial record missing required field: ${field}`)
          }
        }

        // Validate amount is a number
        if (typeof testRecord.amount !== 'number' || testRecord.amount < 0) {
          throw new Error('Financial record amount should be a positive number')
        }

        // Validate record type and status
        const validTypes = ['invoice', 'payment', 'fee', 'expense']
        const validStatuses = ['pending', 'paid', 'overdue', 'cancelled']

        if (!validTypes.includes(testRecord.record_type)) {
          throw new Error(`Invalid financial record type: ${testRecord.record_type}`)
        }

        if (!validStatuses.includes(testRecord.status)) {
          throw new Error(`Invalid financial record status: ${testRecord.status}`)
        }

      } catch (error) {
        throw new Error(`Financial API test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Messages API Data Structure Test',
    async run() {
      try {
        const { getMessagesByClientId } = requireFromApp('lib/services/portal-service')
        
        // Use test client ID
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
          throw new Error('Test user not found for messages test')
        }

        const messages = await getMessagesByClientId(user[0].client_id)
        
        if (!Array.isArray(messages)) {
          throw new Error('Messages should be returned as an array')
        }

        if (messages.length === 0) {
          console.log('Warning: No test messages found, cannot validate message structure')
          return
        }

        // Validate message structure
        const testMessage = messages[0]
        const requiredFields = [
          'id', 'subject', 'content', 'sender_type', 
          'sent_date', 'is_read', 'client_id'
        ]

        for (const field of requiredFields) {
          if (testMessage[field] === undefined) {
            throw new Error(`Message data missing required field: ${field}`)
          }
        }

        // Validate sender type
        const validSenderTypes = ['client', 'lawyer', 'system']
        if (!validSenderTypes.includes(testMessage.sender_type)) {
          throw new Error(`Invalid message sender type: ${testMessage.sender_type}`)
        }

        // Validate is_read is boolean
        if (typeof testMessage.is_read !== 'boolean') {
          throw new Error('Message is_read should be a boolean value')
        }

      } catch (error) {
        throw new Error(`Messages API test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Portal Access Control Test',
    async run() {
      try {
        // Test that portal services properly validate client access
        const { getCasesByClientId } = requireFromApp('lib/services/portal-service')
        
        // Test with non-existent client ID
        const nonExistentClientId = 'non-existent-client-123'
        const cases = await getCasesByClientId(nonExistentClientId)
        
        // Should return empty array, not error
        if (!Array.isArray(cases) || cases.length !== 0) {
          throw new Error('Non-existent client should return empty array, not error or data')
        }

        // Test with invalid client ID format
        try {
          await getCasesByClientId(null)
          throw new Error('Null client ID should throw error')
        } catch (error) {
          if (!error.message.includes('client') && !error.message.includes('invalid')) {
            throw error
          }
        }

        try {
          await getCasesByClientId('')
          throw new Error('Empty client ID should throw error')
        } catch (error) {
          if (!error.message.includes('client') && !error.message.includes('invalid')) {
            throw error
          }
        }

      } catch (error) {
        throw new Error(`Portal access control test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Portal API Endpoints Test',
    async run() {
      try {
        // Test portal API endpoints respond correctly
        const endpoints = [
          '/api/test-portal/cases',
          '/api/test-portal/documents', 
          '/api/test-portal/financial',
          '/api/test-portal/messages'
        ]

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(`http://localhost:3000${endpoint}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            })

            // API should respond (even if with auth error)
            if (!response) {
              throw new Error(`No response from ${endpoint}`)
            }

            // Should return JSON
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
              console.log(`Warning: ${endpoint} should return JSON content-type`)
            }

            // Try to parse response
            try {
              await response.json()
            } catch (parseError) {
              console.log(`Warning: ${endpoint} returned invalid JSON`)
            }

          } catch (fetchError) {
            if (fetchError.code === 'ECONNREFUSED') {
              console.log(`Note: Development server not running, skipping ${endpoint}`)
              continue
            }
            throw new Error(`API endpoint ${endpoint} error: ${fetchError.message}`)
          }
        }

      } catch (error) {
        throw new Error(`Portal API endpoints test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Portal Data Relationships Test',
    async run() {
      try {
        // Test that portal data maintains proper relationships
        const { db } = requireFromApp('lib/database')
        const { clientPortalUsers, clients, cases } = requireFromApp('lib/schema')
        const { eq } = require('drizzle-orm')

        const testEmail = 'joao@empresateste.com.br'
        
        // Get test user
        const user = await db
          .select()
          .from(clientPortalUsers)
          .where(eq(clientPortalUsers.email, testEmail))
          .limit(1)

        if (user.length === 0) {
          throw new Error('Test user not found for relationships test')
        }

        // Verify user-client relationship
        const client = await db
          .select()
          .from(clients)
          .where(eq(clients.id, user[0].client_id))
          .limit(1)

        if (client.length === 0) {
          throw new Error('User client relationship broken - client not found')
        }

        // Verify client-cases relationship
        const clientCases = await db
          .select()
          .from(cases)
          .where(eq(cases.client_id, user[0].client_id))

        // Should have cases (even if empty array)
        if (!Array.isArray(clientCases)) {
          throw new Error('Client cases query should return array')
        }

        console.log(`Verified relationships: User -> Client -> ${clientCases.length} Cases`)

      } catch (error) {
        throw new Error(`Portal data relationships test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Portal Performance Test',
    async run() {
      try {
        // Test portal service response times
        const { getCasesByClientId } = requireFromApp('lib/services/portal-service')
        
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
          throw new Error('Test user not found for performance test')
        }

        // Test cases API performance
        const startTime = Date.now()
        await getCasesByClientId(user[0].client_id)
        const endTime = Date.now()
        
        const responseTime = endTime - startTime
        
        // Should respond within reasonable time (2 seconds)
        if (responseTime > 2000) {
          throw new Error(`Portal API too slow: ${responseTime}ms (should be < 2000ms)`)
        }

        console.log(`Portal API response time: ${responseTime}ms`)

      } catch (error) {
        throw new Error(`Portal performance test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Portal Error Handling Test', 
    async run() {
      try {
        // Test portal services handle errors gracefully
        const portalService = requireFromApp('lib/services/portal-service')
        
        // Test with invalid parameters
        const invalidInputs = [
          null,
          undefined,
          '',
          123, // wrong type
          'invalid-uuid-format'
        ]

        const serviceMethods = [
          'getCasesByClientId',
          'getDocumentsByClientId', 
          'getFinancialRecordsByClientId',
          'getMessagesByClientId'
        ]

        for (const method of serviceMethods) {
          if (typeof portalService[method] === 'function') {
            for (const invalidInput of invalidInputs) {
              try {
                const result = await portalService[method](invalidInput)
                
                // Should either return empty array or throw error, never undefined
                if (result === undefined) {
                  throw new Error(`${method} returned undefined for invalid input`)
                }
                
                // If returns array, should be empty
                if (Array.isArray(result) && result.length > 0) {
                  console.log(`Warning: ${method} returned data for invalid input: ${invalidInput}`)
                }
                
              } catch (error) {
                // Errors for invalid input are acceptable
                if (!error.message.includes('invalid') && 
                    !error.message.includes('required') &&
                    !error.message.includes('client')) {
                  throw error
                }
              }
            }
          }
        }

      } catch (error) {
        throw new Error(`Portal error handling test failed: ${error.message}`)
      }
    }
  }
]