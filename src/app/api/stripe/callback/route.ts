import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { exchangeCodeForToken } from '@/lib/stripe'
import crypto from 'crypto'

// Simple encryption for tokens (use proper key management in production)
const ENCRYPTION_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) || 'default-key-change-in-production'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32))
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=No authorization code', request.url))
  }

  const supabase = createClient()
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Exchange code for tokens
    const response = await exchangeCodeForToken(code)
    
    const stripeAccountId = response.stripe_user_id
    const accessToken = response.access_token
    const refreshToken = response.refresh_token
    
    if (!accessToken || !refreshToken) {
      return NextResponse.redirect(new URL('/dashboard?error=Failed to get access token', request.url))
    }
    
    // Stripe OAuth tokens typically expire in 1 hour (3600 seconds)
    // The expires_in property may not be available in all cases
    const expiresIn = 3600 

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(accessToken)
    const encryptedRefreshToken = encrypt(refreshToken)

    // Get Stripe account email
    // Note: In production, you might want to fetch this from Stripe API
    const stripeEmail = user.email

    // Store in database
    const { error: dbError } = await supabase
      .from('stripe_accounts')
      .upsert({
        user_id: user.id,
        stripe_account_id: stripeAccountId,
        stripe_email: stripeEmail,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      }, {
        onConflict: 'stripe_account_id'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(new URL('/dashboard?error=Failed to save account', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard?success=Stripe account connected', request.url))
  } catch (err) {
    console.error('Stripe OAuth error:', err)
    return NextResponse.redirect(new URL('/dashboard?error=Failed to connect Stripe account', request.url))
  }
}