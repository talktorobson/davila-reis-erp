# D'Avila Reis ERP - Testing Documentation

## 🧪 Testing Framework Overview

This document provides comprehensive guidance for running, understanding, and maintaining the test suite for the D'Avila Reis law firm ERP/CRM system.

## 📋 Test Structure

### Test Categories

1. **Database Tests** (`database-tests.js`)
   - Database connection validation
   - Schema integrity checks
   - Test data verification
   - Performance benchmarks

2. **Authentication Tests** (`auth-tests.js`)
   - User authentication flows
   - JWT token generation/validation
   - Session management
   - Password security

3. **API Endpoint Tests** (`api-tests.js`)
   - Health check endpoints
   - Contact form processing
   - Lead management APIs
   - Error handling

4. **Portal Feature Tests** (`portal-feature-tests.js`)
   - Client portal functionality
   - Cases, documents, financial records
   - Access controls
   - Data relationships

5. **Security & Middleware Tests** (`middleware-security-tests.js`)
   - Security headers
   - Authentication middleware
   - Protected route access
   - Password hashing
   - Environment security

## 🚀 Running Tests

### Quick Start

```bash
# Navigate to project directory
cd ~/Documents/System-Small-Law-Firm/davila-reis-erp

# Run all tests
node scripts/test-runner.js

# Run specific test suites
node scripts/test-runner.js database
node scripts/test-runner.js auth
node scripts/test-runner.js api
node scripts/test-runner.js portal
node scripts/test-runner.js security
```

### Test Commands Reference

| Command | Description | Server Required |
|---------|-------------|----------------|
| `all` (default) | Run complete test suite | Yes |
| `database` | Database connectivity and schema | No |
| `auth` | Authentication and security | Yes |
| `api` | API endpoints and responses | Yes |
| `portal` | Client portal features | Yes |
| `security` | Security headers and middleware | Yes |

## 🔧 Test Prerequisites

### Environment Setup

1. **Database Access**
   ```bash
   # Required environment variable
   DATABASE_URL=postgresql://user:pass@host/dbname
   ```

2. **Authentication Secrets**
   ```bash
   # For JWT token generation
   NEXTAUTH_SECRET=your-secret-key
   ```

3. **Test Data**
   - Test user: `joao@empresateste.com.br`
   - Test client with associated cases, documents
   - Sample financial records and messages

### Development Server

Most tests require the development server to be running. The test runner automatically:
- Starts the server (`npm run dev`)
- Waits for server initialization
- Runs tests against `http://localhost:3000`
- Stops the server after tests complete

## 📊 Test Reports

### Automatic Reporting

After each test run, the system generates:

1. **Console Output**
   - Real-time test progress
   - Pass/fail status for each test
   - Summary statistics
   - System diagnostics
   - Recommendations

2. **JSON Report** (`test-report.json`)
   ```json
   {
     "summary": {
       "totalTests": 45,
       "passed": 43,
       "failed": 2,
       "successRate": "95.6%",
       "duration": "12.34s"
     },
     "system": {
       "nodeVersion": "v20.x.x",
       "platform": "darwin",
       "memory": {...},
       "dependencies": {...}
     },
     "testSuites": [...],
     "recommendations": [...]
   }
   ```

### Interpreting Results

**Success Indicators:**
- ✅ Test passes without errors
- 🟡 Test passes with warnings
- ❌ Test fails with error message

**Success Rate Benchmarks:**
- 100% - System ready for production
- 95-99% - Minor issues, review warnings
- 80-94% - Significant issues, investigate failures
- <80% - Major problems, system unstable

## 🛠️ Test Development

### Adding New Tests

1. **Choose Test Category**
   - Determine which test file to modify
   - Follow existing patterns and structure

2. **Test Structure**
   ```javascript
   {
     name: 'Descriptive Test Name',
     async run() {
       try {
         // Test implementation
         const result = await someFunction()
         
         // Assertions
         if (!result.success) {
           throw new Error('Test failed: reason')
         }
         
         // Optional: Additional validations
         
       } catch (error) {
         throw new Error(`Test failed: ${error.message}`)
       }
     }
   }
   ```

3. **Best Practices**
   - Use descriptive test names
   - Include error context in failures
   - Test both success and failure paths
   - Validate data structure and types
   - Check security boundaries

### Test Utilities

**Helper Functions:**
```javascript
// Import app modules
function requireFromApp(modulePath) {
  return require(path.join(process.cwd(), 'src', modulePath))
}

// Database helpers
const { db } = requireFromApp('lib/database')
const { eq } = require('drizzle-orm')

// Authentication helpers
const { generateToken, verifyToken } = requireFromApp('lib/auth-client')
```

## 🔍 Troubleshooting

### Common Test Failures

**Database Connection Issues**
```
Error: Database test failed: connection refused
```
**Solution:** 
- Verify `DATABASE_URL` is set correctly
- Check GCP Cloud SQL connectivity
- Ensure database instance is running

**Server Startup Failures**
```
Error: Server startup timeout
```
**Solution:**
- Check for compilation errors: `npm run build`
- Verify all dependencies: `npm install`
- Review environment variables

**Authentication Test Failures**
```
Error: JWT token test failed: invalid secret
```
**Solution:**
- Set `NEXTAUTH_SECRET` environment variable
- Ensure secret is at least 32 characters
- Check auth configuration

**API Endpoint Not Found**
```
Error: 404 Page not found
```
**Solution:**
- Verify API routes exist in `src/app/api/`
- Check route naming and structure
- Ensure development server is running

### Performance Issues

**Slow Database Tests**
- Check Cloud SQL connection latency
- Review query optimization
- Consider connection pooling

**Server Startup Delays**
- Clear Next.js cache: `rm -rf .next`
- Check for heavy imports
- Review module dependencies

## 📈 Continuous Integration

### Automated Testing

**Pre-commit Checks:**
```bash
# Run before committing code
npm run type-check
npm run lint
node scripts/test-runner.js database
```

**Pre-deployment Validation:**
```bash
# Full test suite
node scripts/test-runner.js all

# Check test report
cat test-report.json | jq '.summary'
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
- name: Run Test Suite
  run: |
    npm install
    node scripts/test-runner.js all
    
- name: Check Test Results
  run: |
    if [ -f test-report.json ]; then
      SUCCESS_RATE=$(cat test-report.json | jq -r '.summary.successRate' | sed 's/%//')
      if [ "$SUCCESS_RATE" -lt "95" ]; then
        echo "Test success rate below 95%: $SUCCESS_RATE%"
        exit 1
      fi
    fi
```

## 🎯 Test Coverage Goals

### Current Coverage

| Component | Coverage | Status |
|-----------|----------|--------|
| Database Layer | 90%+ | ✅ Complete |
| Authentication | 85%+ | ✅ Complete |
| API Endpoints | 80%+ | ✅ Complete |
| Portal Features | 75%+ | ✅ Complete |
| Security/Middleware | 85%+ | ✅ Complete |

### Target Metrics

- **Overall Success Rate:** 95%+
- **Database Performance:** <500ms queries
- **API Response Time:** <2s
- **Server Startup:** <30s
- **Memory Usage:** Stable, no leaks

## 📚 Additional Resources

### Related Documentation

- [README.md](../README.md) - Project overview and setup
- [Database Schema](../src/lib/schema.ts) - Database structure
- [API Routes](../src/app/api/) - API endpoint implementations
- [Authentication](../src/lib/auth-client.ts) - Auth configuration

### External Resources

- [Drizzle ORM Testing](https://orm.drizzle.team/docs/overview)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [PostgreSQL Testing](https://www.postgresql.org/docs/current/regress.html)

## 🆘 Support

### Getting Help

1. **Review Test Output:** Check console logs and error messages
2. **Check Documentation:** Refer to this guide and project README
3. **Validate Environment:** Ensure all prerequisites are met
4. **Run Diagnostics:** Use `node scripts/test-runner.js database`

### Reporting Issues

When reporting test failures, include:
- Test command executed
- Full error output
- System information (Node version, platform)
- Environment variable status
- Recent code changes

---

**Built with ❤️ for D'Avila Reis Advogados - Ensuring system reliability since 2004**

*Last updated: 2025-06-14*