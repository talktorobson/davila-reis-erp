// Authentication Integration Tests
// Tests the complete authentication flow end-to-end

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const testCredentials = {
  email: 'joao@empresateste.com.br',
  password: 'teste123',
  cnpj: '12.345.678/0001-90'
}

module.exports = [
  {
    name: 'Login API - Valid Credentials',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCredentials)
      })

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(`Login API returned error: ${data.error}`)
      }

      if (!data.user || !data.user.email) {
        throw new Error('Login response missing user data')
      }

      if (data.user.email !== testCredentials.email) {
        throw new Error('Login returned wrong user email')
      }

      // Check for session cookie
      const cookies = response.headers.get('set-cookie')
      if (!cookies || !cookies.includes('auth-session=')) {
        throw new Error('Login did not set authentication cookie')
      }
    }
  },

  {
    name: 'Login API - Invalid Email',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testCredentials,
          email: 'invalid@example.com'
        })
      })

      if (response.status !== 401) {
        throw new Error(`Expected 401 status for invalid email, got ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        throw new Error('Login should fail with invalid email')
      }
    }
  },

  {
    name: 'Login API - Invalid Password',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testCredentials,
          password: 'wrongpassword'
        })
      })

      if (response.status !== 401) {
        throw new Error(`Expected 401 status for invalid password, got ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        throw new Error('Login should fail with invalid password')
      }
    }
  },

  {
    name: 'Login API - Invalid CNPJ',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testCredentials,
          cnpj: '99.999.999/9999-99'
        })
      })

      if (response.status !== 401) {
        throw new Error(`Expected 401 status for invalid CNPJ, got ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        throw new Error('Login should fail with invalid CNPJ')
      }
    }
  },

  {
    name: 'Session API - Valid Session',
    async run(port) {
      // First login to get session
      const loginResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCredentials)
      })

      const cookies = loginResponse.headers.get('set-cookie')
      const sessionCookie = cookies.match(/auth-session=([^;]+)/)?.[1]

      if (!sessionCookie) {
        throw new Error('No session cookie received from login')
      }

      // Test session validation
      const sessionResponse = await fetch(`http://localhost:${port}/api/auth/session`, {
        headers: { 'Cookie': `auth-session=${sessionCookie}` }
      })

      if (!sessionResponse.ok) {
        throw new Error(`Session validation failed with status ${sessionResponse.status}`)
      }

      const sessionData = await sessionResponse.json()
      
      if (!sessionData.success) {
        throw new Error(`Session API returned error: ${sessionData.error}`)
      }

      if (!sessionData.user || sessionData.user.email !== testCredentials.email) {
        throw new Error('Session API returned invalid user data')
      }
    }
  },

  {
    name: 'Session API - Invalid Session',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/auth/session`, {
        headers: { 'Cookie': 'auth-session=invalid-token' }
      })

      if (response.status !== 401) {
        throw new Error(`Expected 401 status for invalid session, got ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        throw new Error('Session validation should fail with invalid token')
      }
    }
  },

  {
    name: 'Session API - No Session',
    async run(port) {
      const response = await fetch(`http://localhost:${port}/api/auth/session`)

      if (response.status !== 401) {
        throw new Error(`Expected 401 status for no session, got ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        throw new Error('Session validation should fail with no session')
      }
    }
  },

  {
    name: 'Logout API - Valid Session',
    async run(port) {
      // First login to get session
      const loginResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCredentials)
      })

      const cookies = loginResponse.headers.get('set-cookie')
      const sessionCookie = cookies.match(/auth-session=([^;]+)/)?.[1]

      // Test logout
      const logoutResponse = await fetch(`http://localhost:${port}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Cookie': `auth-session=${sessionCookie}` }
      })

      if (!logoutResponse.ok) {
        throw new Error(`Logout failed with status ${logoutResponse.status}`)
      }

      const logoutData = await logoutResponse.json()
      if (!logoutData.success) {
        throw new Error(`Logout API returned error: ${logoutData.message}`)
      }

      // Check cookie is cleared
      const logoutCookies = logoutResponse.headers.get('set-cookie')
      if (!logoutCookies || !logoutCookies.includes('auth-session=;')) {
        throw new Error('Logout did not clear authentication cookie')
      }
    }
  },

  {
    name: 'URL Parameter Auto-Login',
    async run(port) {
      const url = `http://localhost:${port}/login?email=${encodeURIComponent(testCredentials.email)}&password=${encodeURIComponent(testCredentials.password)}&cnpj=${encodeURIComponent(testCredentials.cnpj)}`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`URL parameter login failed with status ${response.status}`)
      }

      // Check that login page loads (it should process the auto-login)
      const text = await response.text()
      if (!text.includes('D\'avila Reis') && !text.includes('login')) {
        throw new Error('Login page did not load properly')
      }
    }
  }
]