import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { fetchDisputesFromStripe, getDecryptedToken } from '@/lib/stripe-sync'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's Stripe account
  const { data: stripeAccount, error: accountError } = await supabase
    .from('stripe_accounts')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (accountError || !stripeAccount) {
    return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 })
  }

  const accessToken = getDecryptedToken(stripeAccount.access_token_encrypted)

  try {
    const disputes = await fetchDisputesFromStripe(stripeAccount.stripe_account_id, accessToken)

    // Upsert disputes
    for (const dispute of disputes) {
      const { error: disputeError } = await supabase
        .from('disputes')
        .upsert({
          user_id: user.id,
          stripe_account_id: stripeAccount.stripe_account_id,
          stripe_dispute_id: dispute.stripe_dispute_id,
          charge_id: dispute.charge_id,
          reason: dispute.reason,
          amount: dispute.amount,
          currency: dispute.currency,
          status: dispute.status,
          evidence_deadline: dispute.evidence_deadline,
          payment_method_details: dispute.payment_method_details,
          created_at: dispute.created_at,
          updated_at: dispute.updated_at,
          synced_at: dispute.synced_at,
        }, {
          onConflict: 'stripe_dispute_id'
        })

      if (disputeError) {
        console.error('Error upserting dispute:', disputeError)
      }
    }

    // Update last synced time
    await supabase
      .from('stripe_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('stripe_account_id', stripeAccount.stripe_account_id)

    return NextResponse.json({ 
      success: true, 
      count: disputes.length,
      message: `Synced ${disputes.length} disputes` 
    })
  } catch (err) {
    console.error('Error syncing disputes:', err)
    return NextResponse.json({ error: 'Failed to sync disputes' }, { status: 500 })
  }
}