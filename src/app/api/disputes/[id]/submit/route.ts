import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'

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

  const { response } = await request.json()

  if (!response) {
    return NextResponse.json({ error: 'Response content required' }, { status: 400 })
  }

  // Save to database (Stripe submission requires connected account testing)
  const { data: evidence, error } = await supabase
    .from('evidence')
    .insert({
      dispute_id: disputeId,
      user_id: user.id,
      content: response,
      submitted_to_stripe: false, // TODO: Enable after testing with Stripe Connect
      submitted_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving evidence:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update dispute status
  await supabase
    .from('disputes')
    .update({ status: 'under_review', updated_at: new Date().toISOString() })
    .eq('id', disputeId)

  return NextResponse.json({ 
    success: true, 
    message: 'Response saved (Stripe submission needs testing with connected account)',
    evidenceId: evidence?.id
  })
}