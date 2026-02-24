// Re-export from appropriate files based on usage context
// Use src/lib/supabase-client.ts for client components
// Use src/lib/supabase-server.ts for server components and API routes

export { createClient } from './supabase-client'
export { createServerClientWithCookies } from './supabase-server'