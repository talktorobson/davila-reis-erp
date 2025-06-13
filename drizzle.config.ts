// D'Avila Reis ERP - Drizzle Configuration

import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

// Use DATABASE_URL directly for consistency with main application
const dbUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}?sslmode=require`

export default {
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true,
} satisfies Config