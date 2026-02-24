import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    })
  }
  
  return stripeInstance
}

export const stripe = {
  get get() {
    return getStripe()
  }
}

export function getStripeOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/callback`
  
  return `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}`
}

export async function exchangeCodeForToken(code: string) {
  const stripe = getStripe()
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code,
  })
  
  return response
}

export async function refreshToken(refreshToken: string) {
  const stripe = getStripe()
  const response = await stripe.oauth.token({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  
  return response
}