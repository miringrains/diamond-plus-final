/**
 * Environment configuration
 * This file helps manage environment variables with type safety
 */

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL!,
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  
  // GoHighLevel API
  GHL_PRIVATE_KEY: process.env.GHL_PRIVATE_KEY!,
  GHL_LOCATION_ID: process.env.GHL_LOCATION_ID!,
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST!,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER!,
  SMTP_PASS: process.env.SMTP_PASS!,
  SMTP_FROM: process.env.SMTP_FROM!,
  
  // Storage
  VIDEO_STORAGE_PATH: process.env.VIDEO_STORAGE_PATH || '/public/videos',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://165.227.78.164:3000',
}