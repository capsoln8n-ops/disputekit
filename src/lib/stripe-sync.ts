import Stripe from 'stripe'

const ENCRYPTION_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) || 'default-key-change-in-production'

function decrypt(encryptedText: string): string {
  try {
    const [ivHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32))
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return ''
  }
}

export function getDecryptedToken(encryptedToken: string): string {
  return decrypt(encryptedToken)
}

export async function createStripeClientWithAccount(accountId: string, accessToken: string): Promise<Stripe> {
  return new Stripe(accessToken, {
    apiVersion: '2024-12-18.acacia',
  })
}

export async function fetchDisputesFromStripe(stripeAccountId: string, accessToken: string) {
  const stripe = await createStripeClientWithAccount(stripeAccountId, accessToken)
  
  const disputes = await stripe.disputes.list({
    limit: 100,
  })

  return disputes.data.map(dispute => ({
    stripe_dispute_id: dispute.id,
    stripe_account_id: stripeAccountId,
    charge_id: dispute.charge as string,
    reason: dispute.reason,
    amount: dispute.amount,
    currency: dispute.currency,
    status: dispute.status,
    evidence_deadline: dispute.evidence_details?.due_by 
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString() 
      : null,
    payment_method_details: dispute.payment_method_details,
    created_at: new Date(dispute.created * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
  }))
}