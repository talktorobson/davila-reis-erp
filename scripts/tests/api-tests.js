// API Endpoint Integration Tests
// Tests all portal APIs with proper authentication

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const testCredentials = {
  email: 'joao@empresateste.com.br',
  password: 'teste123',
  cnpj: '12.345.678/0001-90'
}

// Helper function to get authenticated session
async function getAuthenticatedSession(port) {
  const response = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCredentials)
  })

  if (!response.ok) {
    throw new Error('Failed to authenticate for API tests')
  }

  const cookies = response.headers.get('set-cookie')
  const sessionCookie = cookies.match(/auth-session=([^;]+)/)?.[1]

  if (!sessionCookie) {
    throw new Error('No session cookie received')
  }

  return sessionCookie
}

module.exports = [
  {
    name: 'Cases API - Authenticated Access',
    async run(port) {
      const sessionCookie = await getAuthenticatedSession(port)
      
      const response = await fetch(`http://localhost:${port}/api/test-portal/cases`, {
        headers: { 'Cookie': `auth-session=${sessionCookie}` }
      })

      if (!response.ok) {
        throw new Error(`Cases API failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(`Cases API returned error: ${data.error}`)
      }

      if (!Array.isArray(data.data)) {
        throw new Error('Cases API should return array of cases')
      }

      if (!data.user || !data.user.name) {
        throw new Error('Cases API should return user information')
      }

      if (!data.summary) {
        throw new Error('Cases API should return summary information')
      }
    }
  },

  {
    name: 'Cases API - Unauthenticated Access',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/test-portal/cases`)

      if (response.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated access, got ${response.status}`)
      }

      const data = await response.json()
      if (!data.error || !data.error.includes('autenticado')) {
        throw new Error('Should return authentication error in Portuguese')
      }
    }
  },

  {
    name: 'Documents API - Authenticated Access',
    async run(port) {
      const sessionCookie = await getAuthenticatedSession(port)
      
      const response = await fetch(`http://localhost:${port}/api/test-portal/documents`, {
        headers: { 'Cookie': `auth-session=${sessionCookie}` }
      })

      if (!response.ok) {
        throw new Error(`Documents API failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(`Documents API returned error: ${data.error}`)
      }

      if (!Array.isArray(data.data)) {
        throw new Error('Documents API should return array of documents')
      }

      if (!data.user) {
        throw new Error('Documents API should return user information')
      }
    }
  },

  {
    name: 'Documents API - Unauthenticated Access',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/test-portal/documents`)

      if (response.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated access, got ${response.status}`)
      }
    }
  },

  {
    name: 'Financial API - Authenticated Access',
    async run(port) {
      const sessionCookie = await getAuthenticatedSession(port)
      
      const response = await fetch(`http://localhost:${port}/api/test-portal/financial`, {
        headers: { 'Cookie': `auth-session=${sessionCookie}` }
      })

      if (!response.ok) {
        throw new Error(`Financial API failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(`Financial API returned error: ${data.error}`)
      }

      if (!Array.isArray(data.data)) {
        throw new Error('Financial API should return array of financial records')
      }

      if (!data.user) {
        throw new Error('Financial API should return user information')
      }

      if (!data.summary) {
        throw new Error('Financial API should return summary information')
      }
    }
  },

  {
    name: 'Financial API - Unauthenticated Access',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/test-portal/financial`)

      if (response.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated access, got ${response.status}`)
      }
    }
  },

  {
    name: 'Messages API - GET Authenticated Access',
    async run(port) {
      const sessionCookie = await getAuthenticatedSession(port)
      
      const response = await fetch(`http://localhost:${port}/api/test-portal/messages`, {
        headers: { 'Cookie': `auth-session=${sessionCookie}` }
      })

      if (!response.ok) {
        throw new Error(`Messages API failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(`Messages API returned error: ${data.error}`)
      }

      if (!Array.isArray(data.data)) {
        throw new Error('Messages API should return array of messages')
      }

      if (!data.user) {
        throw new Error('Messages API should return user information')
      }
    }
  },

  {
    name: 'Messages API - POST New Message',
    async run(port) {
      const sessionCookie = await getAuthenticatedSession(port)
      
      const testMessage = {
        message: 'Test message from integration test',
        type: 'question'
      }

      const response = await fetch(`http://localhost:${port}/api/test-portal/messages`, {
        method: 'POST',
        headers: { 
          'Cookie': `auth-session=${sessionCookie}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testMessage)
      })

      if (!response.ok) {
        throw new Error(`POST Messages API failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(`POST Messages API returned error: ${data.error}`)
      }

      if (!data.message || !data.message.id) {
        throw new Error('POST Messages API should return created message with ID')
      }

      if (data.message.message !== testMessage.message) {
        throw new Error('Created message content does not match')
      }
    }
  },

  {
    name: 'Messages API - Unauthenticated Access',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/test-portal/messages`)

      if (response.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated access, got ${response.status}`)
      }
    }
  },

  {
    name: 'Cases API - Filter by Status',
    async run(port) {
      const sessionCookie = await getAuthenticatedSession(port)
      
      const response = await fetch(`http://localhost:${port}/api/test-portal/cases?status=Open`, {
        headers: { 'Cookie': `auth-session=${sessionCookie}` }
      })

      if (!response.ok) {
        throw new Error(`Cases API with filter failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(`Cases API with filter returned error: ${data.error}`)
      }

      // If there are cases, they should all have Open status
      if (data.data.length > 0) {
        const hasNonOpenCase = data.data.some(caseItem => caseItem.status !== 'Open')
        if (hasNonOpenCase) {
          throw new Error('Filter by status not working correctly')
        }
      }
    }
  },

  {
    name: 'Cases API - Search Functionality',
    async run(port) {
      const sessionCookie = await getAuthenticatedSession(port)
      
      const response = await fetch(`http://localhost:${port}/api/test-portal/cases?search=CASE`, {
        headers: { 'Cookie': `auth-session=${sessionCookie}` }
      })

      if (!response.ok) {
        throw new Error(`Cases API with search failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(`Cases API with search returned error: ${data.error}`)
      }

      // The search should work (may return 0 or more results)
      if (!Array.isArray(data.data)) {
        throw new Error('Search should return an array')
      }
    }
  }
]