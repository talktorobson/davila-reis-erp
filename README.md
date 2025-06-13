# D'avila Reis Law Firm ERP/CRM System

A comprehensive enterprise resource planning and customer relationship management system designed specifically for D'avila Reis Advogados, built with modern web technologies and deployed on Google Cloud Platform.

🌐 **Live Production URL**: https://davila-reis-erp-service-947568652455.southamerica-east1.run.app

## 🎯 Project Overview

**Goal**: Transform legal practice operations and scale from current state to 5MM revenue by 2030  
**Investment**: R$ 58,000-80,000 | **Projected ROI**: 900%+ in year 1  
**Timeline**: 12-week development across 8 phases  
**Status**: Production Ready - Deployed on Google Cloud Platform  

### Business Objectives
- Streamline operations from prospect to payment
- Automate lead capture, nurturing, and conversion (40%+ conversion target)
- Provide 24/7 client portal access
- Improve cash flow through better receivables management
- Scale operations to support significant revenue growth

## 🏗️ Technical Architecture

### Technology Stack
- **Frontend**: Next.js 15 with TypeScript and React Hook Form
- **Database**: PostgreSQL 15 on GCP Cloud SQL
- **ORM**: Drizzle ORM with type-safe queries and lazy initialization
- **Infrastructure**: Google Cloud Platform
  - Cloud SQL (PostgreSQL database with Unix socket connection)
  - Cloud Run (containerized deployment on port 8080)
  - Cloud Build (automated CI/CD pipeline)
  - Secret Manager (secure configuration)
- **Authentication**: NextAuth.js with Google OAuth
- **Email Service**: SendGrid with automated sequences (ready for integration)
- **Validation**: Yup with React Hook Form resolvers
- **Logging**: Winston logger with structured logging
- **Region**: São Paulo (southamerica-east1) for LGPD compliance

### Database Schema
7 interconnected PostgreSQL tables with modern features and optimized design:

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **leads** | Prospect management | Lead scoring, regional assignment, conversion tracking, duplicate prevention |
| **clients** | Active client records | CNPJ validation, service contracts, portal access, rating system |
| **cases** | Legal matter tracking | Progress monitoring, deadline management, billing, court integration |
| **financial_records** | Financial management | Invoice tracking, aging reports, payment processing, tax calculation |
| **documents** | File management | Digital signatures, access control, versioning, ClickSign integration |
| **tasks** | Workflow management | Deadline tracking, staff assignment, time logging, billable hours |
| **staff** | Team management | OAB numbers, specializations, regional coverage, performance tracking |

**Advanced Features**: 
- **Consistency**: Snake_case naming convention, standardized audit fields, proper foreign key constraints
- **Performance**: Strategic indexes on all foreign keys and search fields, optimized queries
- **Integrity**: Check constraints for business rules, unique constraints for business identifiers
- **Modern Design**: UUID primary keys, JSONB columns, enum types, automated timestamps
- **Security**: RBAC-ready structure, audit trails, LGPD compliance-focused design

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Access to GCP project: `davila-reis-law-firm-erp`
- Database credentials (stored in `.env.local`)

### Quick Setup

1. **Clone and Install**
   ```bash
   cd ~/Documents/System-Small-Law-Firm/davila-reis-erp
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.local.example .env.local
   
   # Update with your database credentials
   # (Database is already configured for GCP Cloud SQL)
   ```

3. **Database Setup**
   ```bash
   # Test database connection
   npm run db:test
   
   # Initialize database (if needed)
   npm run db:init
   
   # Run comprehensive verification
   npm run db:verify
   ```

4. **Start Development**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

## 🚀 Deployment Status

### Production Environment
- **Live URL**: https://davila-reis-erp-service-947568652455.southamerica-east1.run.app
- **Status**: ✅ Active and healthy
- **Health Check**: https://davila-reis-erp-service-947568652455.southamerica-east1.run.app/api/health
- **Platform**: Google Cloud Run
- **Region**: São Paulo (southamerica-east1)
- **Container**: Node.js 20 Alpine with optimized build

### Database Configuration
- **Project**: `davila-reis-law-firm-erp`
- **Instance**: `davila-reis-db`
- **Database**: `davila_reis_erp`
- **Connection**: Unix socket for production, lazy initialization
- **Status**: ✅ Connected and operational

### Environment Variables (Production)
```env
DATABASE_URL=postgresql://app_user:PASSWORD@/davila_reis_erp?host=/cloudsql/davila-reis-law-firm-erp:southamerica-east1:davila-reis-db
NEXTAUTH_URL=https://davila-reis-erp-service-947568652455.southamerica-east1.run.app
NEXTAUTH_SECRET=configured
NODE_ENV=production
PORT=8080
```

## 🛠️ Development Scripts

### Core Development Commands
```bash
# Essential development workflow
npm run dev                  # Start development server
npm run build                # Build for production (with env validation skip)
npm run build:prod           # Production build (optimized, no lint)
npm run start                # Start production server
npm run lint                 # Run ESLint
npm run lint:fix             # Auto-fix linting issues  
npm run type-check           # TypeScript validation

# Database management
npm run db:generate          # Generate Drizzle migrations
npm run db:migrate           # Run database migrations
npm run db:push              # Push schema changes directly
npm run db:studio            # Open Drizzle Studio (database UI)
```

### Health & Monitoring
```bash
# Production health checks
curl https://davila-reis-erp-service-947568652455.southamerica-east1.run.app/api/health

# Local health check
npm run dev
curl http://localhost:3000/api/health
```

## 📁 Project Structure

```
davila-reis-erp/
├── src/
│   ├── app/                     # Next.js 15 app router
│   │   ├── api/                 # API routes
│   │   │   ├── auth/           # NextAuth authentication
│   │   │   ├── contact/        # Contact form handling
│   │   │   ├── email/          # Email automation
│   │   │   ├── health/         # Health check endpoint
│   │   │   └── leads/          # Lead management
│   │   ├── globals.css          # Global styles with law firm branding
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Homepage with law firm content
│   ├── components/              # React components
│   │   ├── ui/                  # Reusable UI components
│   │   │   ├── Navigation.tsx   # Main navigation
│   │   │   └── WhatsAppFloat.tsx # WhatsApp integration
│   │   ├── forms/               # Form components
│   │   │   ├── ContactForm.tsx  # Contact form
│   │   │   └── LeadCaptureForm.tsx # Lead capture
│   │   └── dashboard/           # Dashboard components (future)
│   ├── lib/                     # Core libraries
│   │   ├── database.ts          # PostgreSQL connection (Drizzle)
│   │   ├── schema.ts            # Database schema (7 tables)
│   │   ├── auth.ts              # NextAuth configuration
│   │   ├── email.ts             # SendGrid integration
│   │   ├── db-services.ts       # Database operations
│   │   └── services/            # Business logic services
│   │       ├── contact-service.ts    # Contact handling
│   │       ├── database-service.ts   # Generic DB operations
│   │       └── lead-service.ts       # Lead management
│   ├── types/                   # TypeScript definitions
│   │   └── index.ts            # Global type definitions
│   ├── utils/                   # Helper functions
│   │   └── helpers.ts          # Utility functions
│   └── middleware.ts            # Security middleware
├── Dockerfile                   # Production container configuration
├── .dockerignore               # Docker build exclusions
├── cloudbuild.yaml            # GCP Cloud Build configuration
├── public/                      # Static assets
├── .env.local                   # Environment variables
├── .env.local.example          # Environment template
├── package.json                 # Dependencies and scripts
├── next.config.js               # Next.js configuration
├── drizzle.config.ts            # Drizzle ORM configuration
├── eslint.config.mjs           # ESLint configuration
├── tsconfig.json                # TypeScript configuration
└── tsconfig.ts-node.json       # TypeScript for scripts
```

## 🔐 Security & Compliance

### LGPD Compliance
- Data residency in São Paulo region
- Role-based access control (RBAC)
- Audit trails for all data operations
- Secure client data handling

### Security Features
- NextAuth.js authentication
- Secure environment variable management
- SQL injection prevention (Drizzle ORM)
- Security headers middleware
- Encrypted database connections

## 📈 Development Status

### ✅ Phase 1: Foundation (COMPLETE)
- [x] GCP Cloud SQL PostgreSQL setup with Unix socket connection
- [x] Database schema with Drizzle ORM (7 interconnected tables)
- [x] Next.js 15 project structure with TypeScript and strict type checking
- [x] Security middleware and authentication framework
- [x] Core libraries: database, email, auth, validation
- [x] Production-ready Docker containerization

### ✅ Phase 2: Core Application (COMPLETE)
- [x] Professional law firm homepage
- [x] Lead capture forms with React Hook Form + Yup validation
- [x] API routes for lead and contact management
- [x] Health check endpoint with comprehensive monitoring
- [x] Lazy database initialization for build-time compatibility
- [x] Production deployment on Google Cloud Run
- [x] All TypeScript compilation errors resolved

### ✅ Current: Production Deployment (COMPLETE)
- [x] **Live Production System**: https://davila-reis-erp-service-947568652455.southamerica-east1.run.app
- [x] Database connectivity established and operational
- [x] Health monitoring active and reporting system status
- [x] Container optimization with Node.js 20 Alpine
- [x] Security headers and CORS configuration
- [x] Winston logging for production monitoring

### 📋 Upcoming Phases
- **Phase 3**: Client Portal with case tracking and document access
- **Phase 4**: CRM Dashboard with pipeline management and analytics
- **Phase 5**: Financial Management with invoicing and payment tracking
- **Phase 6**: Advanced Integrations (ClickSign, Zapier, WhatsApp Business)
- **Phase 7**: Mobile Application (React Native)
- **Phase 8**: AI-powered Legal Insights and Automation

## 🧪 Quality Assurance & Monitoring

### Production Health Monitoring
- **Health Endpoint**: `/api/health` with comprehensive system checks
- **Database Status**: Real-time connection monitoring
- **Memory Usage**: Container resource monitoring  
- **Environment**: Required environment variable validation
- **Response Time**: API performance tracking

### Code Quality Standards
- **TypeScript**: Strict type checking enabled, all compilation errors resolved
- **ESLint**: Code quality rules enforced, warning-free build
- **Type Safety**: Proper typing throughout codebase with strategic `as any` usage
- **Build Process**: Optimized production builds with environment validation skip

## 📚 Documentation

### Key Guides
- **Setup & Development**: This README file
- **GitHub Pages Deployment**: `../github-deployment-guide.md`
- **GCP Production Deployment**: `../gcp-deployment-guide.md`
- **Database Setup**: `../gcp_infrastructure_setup_guide.md`
- **Security & Monitoring**: `../gcp_monitoring_security_guide.md`
- **Database Connection**: `../gcp_cloud_sql_connection_guide.md`
- **Project Requirements**: `../law_firm_erp_crm.md`

### Development Resources
- **Project Documentation**: `../CLAUDE.md` (Development guidelines)
- **GCP Console**: [Cloud SQL Dashboard](https://console.cloud.google.com/sql/instances?project=davila-reis-law-firm-erp)
- **Drizzle Studio**: `npm run db:studio` (Database management UI)
- **API Documentation**: Auto-generated from TypeScript types
- **Performance Testing**: `npm run db:test:all` (150+ comprehensive tests)

## 🆘 Troubleshooting

### Production Issues

**Health Check Failed**
```bash
# Check production health
curl https://davila-reis-erp-service-947568652455.southamerica-east1.run.app/api/health

# Check logs in GCP Console
gcloud logs read --project=davila-reis-law-firm-erp
```

**Database Connection Issues**
```bash
# Check environment variables
# Verify DATABASE_URL format for Unix socket connection
# Expected: postgresql://user:pass@/dbname?host=/cloudsql/instance-connection-name

# Test local connection
npm run dev
# Check http://localhost:3000/api/health
```

**Build/Deployment Issues**
```bash
# Clear build cache
rm -rf .next

# Check TypeScript compilation
npm run type-check

# Test production build locally
npm run build
npm run start
```

## 📞 Support

### Project Team
- **Technical Lead**: Advanced developer with enterprise system experience
- **Business Stakeholder**: D'avila Reis Advogados
- **Infrastructure**: Google Cloud Platform São Paulo region

### Getting Help
1. Check this README and documentation guides
2. Run diagnostic scripts: `npm run db:verify`
3. Review logs and error messages
4. Consult GCP Cloud SQL documentation

## 🎯 Success Metrics

### Technical KPIs
- **Database Performance**: <500ms query response times
- **Uptime**: 99.9% availability target
- **Security**: Zero critical vulnerabilities
- **Test Coverage**: 85%+ comprehensive test pass rate

### Business KPIs (Post-Launch)
- **Lead Conversion**: >40% visitor-to-lead conversion
- **Response Time**: <2 hours for lead follow-up
- **Client Satisfaction**: >4.5/5.0 portal experience
- **Operational Efficiency**: 20+ hours/week time savings
- **Revenue Growth**: 25% increase in 6 months

---

## 🚀 Deployment Instructions

### Production Deployment (Google Cloud Run)
```bash
# Deploy to production
gcloud builds submit --config=cloudbuild.yaml --project=davila-reis-law-firm-erp

# Check deployment status
gcloud run services list --project=davila-reis-law-firm-erp

# View logs
gcloud logs tail --project=davila-reis-law-firm-erp
```

### Local Development
```bash
# Development setup
npm install
cp .env.local.example .env.local
# Configure DATABASE_URL and other environment variables

# Start development
npm run dev
# Visit: http://localhost:3000
```

## 🎯 Quick Reference

```bash
# Essential commands
npm run dev                  # Local development
npm run build                # Production build
npm run type-check           # TypeScript validation  
npm run lint                 # Code quality check

# Production monitoring
curl https://davila-reis-erp-service-947568652455.southamerica-east1.run.app/api/health

# Database management
npm run db:studio            # Database UI
npm run db:generate          # Generate migrations
npm run db:push              # Push schema changes
```

---

**Built with ❤️ for D'avila Reis Advogados - Protecting businesses since 2004**

*🎉 Production Ready - Live on Google Cloud Platform! 🚀*