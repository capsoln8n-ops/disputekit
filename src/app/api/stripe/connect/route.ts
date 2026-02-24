import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { getStripeOAuthUrl } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const oauthUrl = getStripeOAuthUrl()
  
  return NextResponse.redirect(oauthUrl)
}