import { PrismaClient } from "@prisma/client"

// Create a separate Prisma client for Supabase
const globalForSupabasePrisma = globalThis as unknown as {
  supabasePrisma: PrismaClient | undefined
}

// Use Supabase URL from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase configuration missing")
}

// Build the database URL from Supabase config
// Supabase database URL format: postgresql://postgres.[project-ref]:[service-role-key]@aws-0-[region].pooler.supabase.com:6543/postgres
const projectRef = supabaseUrl.split('.')[0].replace('https://', '')
const databaseUrl = `postgresql://postgres.${projectRef}:${supabaseServiceKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`

export const supabasePrisma = globalForSupabasePrisma.supabasePrisma ?? 
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  })

if (process.env.NODE_ENV !== "production") {
  globalForSupabasePrisma.supabasePrisma = supabasePrisma
}
