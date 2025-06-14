#!/usr/bin/env node

// D'Avila Reis ERP - Comprehensive Test Runner
// Run integration tests to detect issues quickly

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      startTime: Date.now(),
      systemInfo: {}
    }
    this.serverProcess = null
    this.serverPort = null
    this.diagnosticsCollected = false
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  error(message) {
    this.log(`❌ ${message}`, 'red')
  }

  success(message) {
    this.log(`✅ ${message}`, 'green')
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'blue')
  }

  warn(message) {
    this.log(`⚠️  ${message}`, 'yellow')
  }

  async startDevServer() {
    return new Promise((resolve, reject) => {
      this.info('Starting development server...')
      
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe']
      })

      let output = ''
      
      this.serverProcess.stdout.on('data', (data) => {
        output += data.toString()
        if (output.includes('Ready in')) {
          // Extract port from output
          const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/)
          this.serverPort = portMatch ? portMatch[1] : '3000'
          this.success(`Server started on port ${this.serverPort}`)
          setTimeout(resolve, 2000) // Give server time to fully initialize
        }
      })

      this.serverProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString()
        if (errorOutput.includes('Error:') || errorOutput.includes('Failed to compile')) {
          this.error(`Server startup error: ${errorOutput}`)
          reject(new Error(errorOutput))
        }
      })

      this.serverProcess.on('error', (error) => {
        this.error(`Failed to start server: ${error.message}`)
        reject(error)
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.serverPort) {
          reject(new Error('Server startup timeout'))
        }
      }, 30000)
    })
  }

  async stopDevServer() {
    if (this.serverProcess) {
      this.info('Stopping development server...')
      this.serverProcess.kill('SIGTERM')
      await new Promise(resolve => setTimeout(resolve, 2000))
      this.success('Server stopped')
    }
  }

  async runTestSuite(suiteName, tests) {
    this.log(`\n${colors.bold}${colors.cyan}🧪 Running ${suiteName} Tests${colors.reset}`)
    this.log('─'.repeat(50))

    const suiteResults = {
      name: suiteName,
      passed: 0,
      failed: 0,
      tests: []
    }

    for (const test of tests) {
      try {
        this.info(`Running: ${test.name}`)
        await test.run(this.serverPort)
        this.success(`PASSED: ${test.name}`)
        suiteResults.passed++
        suiteResults.tests.push({ name: test.name, status: 'passed' })
        this.results.passed++
      } catch (error) {
        this.error(`FAILED: ${test.name}`)
        this.error(`  Error: ${error.message}`)
        suiteResults.failed++
        suiteResults.tests.push({ name: test.name, status: 'failed', error: error.message })
        this.results.failed++
      }
    }

    this.results.tests.push(suiteResults)
    return suiteResults
  }

  async makeRequest(url, options = {}) {
    const fetch = (await import('node-fetch')).default
    const response = await fetch(url, {
      timeout: 10000,
      ...options
    })
    return response
  }

  async collectSystemDiagnostics() {
    if (this.diagnosticsCollected) return
    
    this.info('Collecting system diagnostics...')
    
    try {
      const os = require('os')
      const pkg = require(path.join(process.cwd(), 'package.json'))
      
      this.results.systemInfo = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100 + ' GB',
          free: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100 + ' GB'
        },
        projectName: pkg.name,
        projectVersion: pkg.version,
        dependencies: {
          next: pkg.dependencies?.next || 'not found',
          typescript: pkg.devDependencies?.typescript || 'not found',
          drizzle: pkg.dependencies?.['drizzle-orm'] || 'not found'
        }
      }

      // Check environment variables
      const envVars = ['NODE_ENV', 'DATABASE_URL', 'NEXTAUTH_SECRET']
      this.results.systemInfo.environment = {}
      
      for (const varName of envVars) {
        const value = process.env[varName]
        this.results.systemInfo.environment[varName] = value ? 'set' : 'not set'
      }

      // Check if database file/connection is available
      try {
        const databaseModule = require(path.join(process.cwd(), 'src', 'lib', 'database'))
        this.results.systemInfo.databaseModule = 'available'
      } catch (error) {
        this.results.systemInfo.databaseModule = `error: ${error.message}`
      }

      this.diagnosticsCollected = true
      
    } catch (error) {
      this.warn(`Failed to collect diagnostics: ${error.message}`)
    }
  }

  async generateTestReport() {
    const endTime = Date.now()
    const duration = endTime - this.results.startTime
    
    const report = {
      summary: {
        totalTests: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: this.results.passed + this.results.failed > 0 
          ? ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1) + '%'
          : '0%',
        duration: `${(duration / 1000).toFixed(2)}s`
      },
      system: this.results.systemInfo,
      testSuites: this.results.tests,
      recommendations: this.generateRecommendations()
    }

    // Save report to file
    const reportPath = path.join(process.cwd(), 'test-report.json')
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      this.success(`Test report saved to: ${reportPath}`)
    } catch (error) {
      this.warn(`Failed to save test report: ${error.message}`)
    }

    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.results.failed > 0) {
      recommendations.push('Fix failing tests before deployment')
      
      // Check for specific failure patterns
      const failedTests = this.results.tests.flatMap(suite => 
        suite.tests.filter(test => test.status === 'failed')
      )
      
      const authFailures = failedTests.filter(test => 
        test.name.toLowerCase().includes('auth') || 
        test.error?.toLowerCase().includes('auth')
      )
      
      if (authFailures.length > 0) {
        recommendations.push('Authentication issues detected - check credentials and JWT configuration')
      }
      
      const dbFailures = failedTests.filter(test => 
        test.name.toLowerCase().includes('database') || 
        test.error?.toLowerCase().includes('database')
      )
      
      if (dbFailures.length > 0) {
        recommendations.push('Database connection issues - verify DATABASE_URL and Cloud SQL access')
      }
    }

    if (!process.env.DATABASE_URL) {
      recommendations.push('Set DATABASE_URL environment variable')
    }

    if (!process.env.NEXTAUTH_SECRET) {
      recommendations.push('Set NEXTAUTH_SECRET environment variable for production')
    }

    const successRate = this.results.passed + this.results.failed > 0 
      ? (this.results.passed / (this.results.passed + this.results.failed)) * 100
      : 0

    if (successRate < 80) {
      recommendations.push('Test success rate below 80% - review system stability')
    } else if (successRate === 100) {
      recommendations.push('All tests passing - system ready for deployment')
    }

    return recommendations
  }

  printSummary() {
    const endTime = Date.now()
    const duration = endTime - this.results.startTime
    
    this.log(`\n${colors.bold}${colors.cyan}📊 Test Summary${colors.reset}`)
    this.log('═'.repeat(50))
    
    const total = this.results.passed + this.results.failed
    this.log(`Total Tests: ${total}`)
    this.log(`Duration: ${(duration / 1000).toFixed(2)}s`)
    this.success(`Passed: ${this.results.passed}`)
    if (this.results.failed > 0) {
      this.error(`Failed: ${this.results.failed}`)
    }
    
    const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0
    this.log(`Success Rate: ${successRate}%`)

    // System info
    if (this.results.systemInfo.nodeVersion) {
      this.log(`\n${colors.bold}System Info:${colors.reset}`)
      this.log(`Node.js: ${this.results.systemInfo.nodeVersion}`)
      this.log(`Platform: ${this.results.systemInfo.platform}`)
      this.log(`Memory: ${this.results.systemInfo.memory?.free} free of ${this.results.systemInfo.memory?.total}`)
    }

    // Detailed results
    for (const suite of this.results.tests) {
      this.log(`\n${colors.bold}${suite.name} (${suite.passed}/${suite.passed + suite.failed}):${colors.reset}`)
      for (const test of suite.tests) {
        const icon = test.status === 'passed' ? '✅' : '❌'
        this.log(`  ${icon} ${test.name}`)
        if (test.error) {
          this.log(`    ${colors.red}${test.error}${colors.reset}`)
        }
      }
    }

    // Recommendations
    const recommendations = this.generateRecommendations()
    if (recommendations.length > 0) {
      this.log(`\n${colors.bold}${colors.yellow}💡 Recommendations:${colors.reset}`)
      for (const rec of recommendations) {
        this.log(`  • ${rec}`)
      }
    }
  }
}

module.exports = TestRunner

// CLI execution
if (require.main === module) {
  const TestRunner = require('./test-runner')
  const runner = new TestRunner()
  
  const args = process.argv.slice(2)
  const command = args[0] || 'all'

  async function main() {
    try {
      // Collect system diagnostics first
      await runner.collectSystemDiagnostics()
      
      switch (command) {
        case 'auth':
          await runner.startDevServer()
          await runner.runTestSuite('Authentication', require('./tests/auth-tests'))
          await runner.stopDevServer()
          break
        case 'api':
          await runner.startDevServer()
          await runner.runTestSuite('API Endpoints', require('./tests/api-tests'))
          await runner.stopDevServer()
          break
        case 'portal':
          await runner.startDevServer()
          await runner.runTestSuite('Portal Features', require('./tests/portal-feature-tests'))
          await runner.stopDevServer()
          break
        case 'security':
          await runner.startDevServer()
          await runner.runTestSuite('Security & Middleware', require('./tests/middleware-security-tests'))
          await runner.stopDevServer()
          break
        case 'database':
          await runner.runTestSuite('Database', require('./tests/database-tests'))
          break
        case 'all':
        default:
          await runner.runTestSuite('Database', require('./tests/database-tests'))
          await runner.startDevServer()
          await runner.runTestSuite('Authentication', require('./tests/auth-tests'))
          await runner.runTestSuite('API Endpoints', require('./tests/api-tests'))
          await runner.runTestSuite('Portal Features', require('./tests/portal-feature-tests'))
          await runner.runTestSuite('Security & Middleware', require('./tests/middleware-security-tests'))
          await runner.stopDevServer()
          break
      }
      
      // Generate detailed report
      await runner.generateTestReport()
      
      runner.printSummary()
      process.exit(runner.results.failed > 0 ? 1 : 0)
    } catch (error) {
      runner.error(`Test runner failed: ${error.message}`)
      await runner.stopDevServer()
      process.exit(1)
    }
  }

  main()
}