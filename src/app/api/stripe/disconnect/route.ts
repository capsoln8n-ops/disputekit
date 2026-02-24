import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'

export async function DELETE(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete the user's Stripe account connection
  const { error } = await supabase
    .from('stripe_accounts')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Stripe account disconnected' })
}