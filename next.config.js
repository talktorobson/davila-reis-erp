/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pg'],
  images: {
    domains: ['storage.googleapis.com'],
    unoptimized: process.env.NODE_ENV === 'production'
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
    GCP_STORAGE_BUCKET: process.env.GCP_STORAGE_BUCKET
  }
}

module.exports = nextConfig