import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingEnvVars = []

if (!supabaseUrl) missingEnvVars.push('VITE_SUPABASE_URL')
if (!supabaseAnonKey) missingEnvVars.push('VITE_SUPABASE_ANON_KEY')

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing Supabase environment variables: ${missingEnvVars.join(', ')}. ` +
      'Define them in .env.local for local dev and in GitHub Actions Variables or Secrets for deployment.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
