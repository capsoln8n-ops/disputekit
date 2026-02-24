import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getDecryptedToken } from '@/lib/stripe-sync'
import Stripe from 'stripe'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: disputeId } = await params
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get dispute
  const { data: dispute } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .eq('user_id', user.id)
    .single()

  if (!dispute) {
    return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
  }

  // Get user's Stripe account
  const { data: stripeAccount } = await supabase
    .from('stripe_accounts')
    .select('*')
    .eq('stripe_account_id', dispute.stripe_account_id)
    .single()

  if (!stripeAccount) {
    return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 })
  }

  const { response } = await request.json()

  if (!response) {
    return NextResponse.json({ error: 'Response content required' }, { status: 400 })
  }

  const accessToken = getDecryptedToken(stripeAccount.access_token_encrypted)

  try {
    const stripe = new Stripe(accessToken, {
      apiVersion: '2024-12-18.acacia',
    })

    // Submit evidence to Stripe
    const evidence = await stripe.disputes.submitEvidence(dispute.stripe_dispute_id, {
      response: response,
    })

    // Save to database
    await supabase
      .from('evidence')
      .insert({
        dispute_id: disputeId,
        user_id: user.id,
        content: response,
        submitted_to_stripe: true,
        stripe_evidence_id: evidence.id,
        submitted_at: new Date().toISOString()
      })

    // Update dispute status
    await supabase
      .from('disputes')
      .update({ status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', disputeId)

    return NextResponse.json({ 
      success: true, 
      message: 'Evidence submitted to Stripe',
      evidenceId: evidence.id
    })
  } catch (err: any) {
    console.error('Error submitting evidence:', err)
    return NextResponse.json({ error: err.message || 'Failed to submit evidence' }, { status: 500 })
  }
}