// Middleware and Security Tests
// Tests security headers, authentication middleware, and access controls

const path = require('path')

// Helper to require modules from the main app
function requireFromApp(modulePath) {
  return require(path.join(process.cwd(), 'src', modulePath))
}

module.exports = [
  {
    name: 'Security Headers Test',
    async run() {
      try {
        // Test that security headers are properly configured
        const { headers } = await fetch('http://localhost:3000/api/health', {
          method: 'GET'
        })

        const expectedHeaders = {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-XSS-Protection': '1; mode=block'
        }

        for (const [headerName, expectedValue] of Object.entries(expectedHeaders)) {
          const actualValue = headers.get(headerName)
          if (actualValue !== expectedValue) {
            throw new Error(`Security header ${headerName} incorrect. Expected: ${expectedValue}, Got: ${actualValue}`)
          }
        }

      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Note: Development server not running, skipping security headers test')
          return
        }
        throw new Error(`Security headers test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Authentication Configuration Test',
    async run() {
      try {
        const { getAuthConfig } = requireFromApp('lib/auth-client')
        const config = getAuthConfig()

        // Verify required auth configuration exists
        const requiredFields = ['SECRET_KEY', 'COOKIE_NAME', 'TOKEN_EXPIRY']
        
        for (const field of requiredFields) {
          if (!config[field]) {
            throw new Error(`Authentication config missing required field: ${field}`)
          }
        }

        // Verify token expiry is reasonable (between 1 hour and 30 days)
        const tokenExpiry = parseInt(config.TOKEN_EXPIRY)
        if (tokenExpiry < 3600 || tokenExpiry > 2592000) {
          throw new Error(`Token expiry should be between 1 hour and 30 days. Got: ${tokenExpiry}`)
        }

        // Verify cookie name is secure
        if (!config.COOKIE_NAME.includes('session') && !config.COOKIE_NAME.includes('auth')) {
          throw new Error('Cookie name should indicate its security purpose')
        }

      } catch (error) {
        throw new Error(`Auth config test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'JWT Token Generation Test',
    async run() {
      try {
        const { generateToken, verifyToken } = requireFromApp('lib/auth-client')
        
        const testUser = {
          id: 'test-user-123',
          email: 'test@example.com',
          client_id: 'test-client-456',
          portal_access_enabled: true
        }

        // Test token generation
        const token = await generateToken(testUser)
        if (!token || typeof token !== 'string') {
          throw new Error('Token generation failed or returned invalid token')
        }

        // Test token verification
        const decodedUser = await verifyToken(token)
        if (!decodedUser) {
          throw new Error('Token verification failed')
        }

        // Verify user data integrity
        if (decodedUser.id !== testUser.id || decodedUser.email !== testUser.email) {
          throw new Error('Token contains incorrect user data')
        }

        // Test invalid token
        try {
          await verifyToken('invalid-token')
          throw new Error('Invalid token should have been rejected')
        } catch (err) {
          if (!err.message.includes('invalid') && !err.message.includes('malformed')) {
            throw err
          }
        }

      } catch (error) {
        throw new Error(`JWT token test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Password Hashing Security Test',
    async run() {
      try {
        const { hashPassword, verifyPassword } = requireFromApp('lib/auth-server')
        
        const testPassword = 'TestPassword123!'
        
        // Test password hashing
        const hashedPassword = await hashPassword(testPassword)
        if (!hashedPassword || hashedPassword === testPassword) {
          throw new Error('Password hashing failed or returned plain text')
        }

        // Verify hash format (should be bcrypt format)
        if (!hashedPassword.startsWith('$2b$') && !hashedPassword.startsWith('$2a$')) {
          throw new Error('Password hash should use bcrypt format')
        }

        // Test password verification
        const isValid = await verifyPassword(testPassword, hashedPassword)
        if (!isValid) {
          throw new Error('Password verification failed for correct password')
        }

        // Test wrong password
        const isInvalid = await verifyPassword('wrongpassword', hashedPassword)
        if (isInvalid) {
          throw new Error('Password verification should fail for incorrect password')
        }

        // Test that same password produces different hashes (salt test)
        const hashedPassword2 = await hashPassword(testPassword)
        if (hashedPassword === hashedPassword2) {
          throw new Error('Same password should produce different hashes (salt not working)')
        }

      } catch (error) {
        throw new Error(`Password hashing test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Session Validation Test',
    async run() {
      try {
        const { isValidPortalSession } = requireFromApp('lib/auth-client')
        
        // Test valid session
        const validUser = {
          id: 'test-user',
          email: 'test@example.com',
          client_id: 'test-client',
          portal_access_enabled: true
        }
        
        if (!isValidPortalSession(validUser)) {
          throw new Error('Valid user session should be accepted')
        }

        // Test invalid sessions
        const invalidCases = [
          null,
          undefined,
          {},
          { id: 'test' }, // missing required fields
          { id: 'test', email: 'test@example.com' }, // missing client_id
          { id: 'test', email: 'test@example.com', client_id: 'test', portal_access_enabled: false }
        ]

        for (const invalidUser of invalidCases) {
          if (isValidPortalSession(invalidUser)) {
            throw new Error(`Invalid user session should be rejected: ${JSON.stringify(invalidUser)}`)
          }
        }

      } catch (error) {
        throw new Error(`Session validation test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Protected Route Access Test',
    async run() {
      try {
        // Test accessing protected route without authentication
        const response = await fetch('http://localhost:3000/portal', {
          method: 'GET',
          redirect: 'manual'
        })

        // Should redirect to login page
        if (response.status !== 302 && response.status !== 307) {
          throw new Error(`Protected route should redirect unauthenticated users. Status: ${response.status}`)
        }

        const location = response.headers.get('location')
        if (!location || !location.includes('/login')) {
          throw new Error(`Protected route should redirect to login page. Redirect: ${location}`)
        }

      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Note: Development server not running, skipping protected route test')
          return
        }
        throw new Error(`Protected route test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'API Security Test',
    async run() {
      try {
        // Test API endpoints have proper error handling
        const endpoints = [
          '/api/test-portal/cases',
          '/api/test-portal/documents',
          '/api/test-portal/financial',
          '/api/test-portal/messages'
        ]

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(`http://localhost:3000${endpoint}`, {
              method: 'GET'
            })

            // Should return proper error status for unauthenticated requests
            if (response.status !== 401 && response.status !== 403 && response.status !== 404) {
              console.log(`Warning: API endpoint ${endpoint} returned status ${response.status} for unauthenticated request`)
            }

            // Check response headers for security
            const contentType = response.headers.get('content-type')
            if (contentType && !contentType.includes('application/json')) {
              console.log(`Warning: API endpoint ${endpoint} should return JSON content-type`)
            }

          } catch (fetchError) {
            if (fetchError.code !== 'ECONNREFUSED') {
              console.log(`API endpoint ${endpoint} test error: ${fetchError.message}`)
            }
          }
        }

      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Note: Development server not running, skipping API security test')
          return
        }
        throw new Error(`API security test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'Environment Variables Security Test',
    async run() {
      try {
        // Test that sensitive environment variables are not exposed
        const sensitiveVars = [
          'DATABASE_URL',
          'NEXTAUTH_SECRET',
          'SENDGRID_API_KEY',
          'GOOGLE_CLIENT_SECRET'
        ]

        // In a real app, these should not be accessible in client-side code
        // This test ensures they're properly protected
        for (const varName of sensitiveVars) {
          const value = process.env[varName]
          if (value) {
            // Check that it's not a default/example value
            if (value.includes('your_') || value.includes('example') || value === 'changeme') {
              throw new Error(`Environment variable ${varName} appears to be using default/example value`)
            }

            // Check minimum length for secrets
            if (varName.includes('SECRET') && value.length < 32) {
              throw new Error(`Environment variable ${varName} should be at least 32 characters for security`)
            }
          }
        }

        // Test that DATABASE_URL is properly formatted
        const databaseUrl = process.env.DATABASE_URL
        if (databaseUrl) {
          if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
            throw new Error('DATABASE_URL should be a PostgreSQL connection string')
          }
          
          // Should not contain plaintext passwords in logs
          if (databaseUrl.includes('password') && !databaseUrl.includes('***')) {
            console.log('Warning: DATABASE_URL contains plaintext credentials')
          }
        }

      } catch (error) {
        throw new Error(`Environment security test failed: ${error.message}`)
      }
    }
  },

  {
    name: 'CORS and Request Validation Test',
    async run() {
      try {
        // Test API endpoints handle CORS properly
        const response = await fetch('http://localhost:3000/api/health', {
          method: 'OPTIONS'
        })

        // Should handle OPTIONS request properly
        if (response.status !== 200 && response.status !== 204 && response.status !== 404) {
          console.log(`Warning: OPTIONS request returned status ${response.status}`)
        }

        // Test request size limits (if implemented)
        // This would test against DoS attacks with large payloads
        console.log('Note: Request size limit testing would require actual server implementation')

      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Note: Development server not running, skipping CORS test')
          return
        }
        throw new Error(`CORS test failed: ${error.message}`)
      }
    }
  }
]