import { redirect } from 'next/navigation'
import { createServerClientWithCookies } from '@/lib/supabase'
import { cookies } from 'next/headers'
import Link from 'next/link'

async function getDispute(id: string, userId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClientWithCookies(cookieStore)
  
  const { data } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  
  return data
}

async function getEvidence(disputeId: string, userId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClientWithCookies(cookieStore)
  
  const { data } = await supabase
    .from('evidence')
    .select('*')
    .eq('dispute_id', disputeId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return data
}

export default async function DisputeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClientWithCookies(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const dispute = await getDispute(id, user.id)
  
  if (!dispute) {
    redirect('/dashboard')
  }

  const evidence = await getEvidence(id, user.id)

  const reasonDescriptions: Record<string, string> = {
    'duplicate': 'The customer claims this charge was duplicated',
    'fraud': 'The customer claims they did not authorize this charge',
    'product_not_received': 'The customer claims they did not receive the product/service',
    'product_unacceptable': 'The customer claims the product/service was not as described',
    'subscription_canceled': 'The customer claims they canceled a subscription',
    'uncategorized': 'The dispute does not fit standard categories'
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to Dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>Dispute Details</h1>
          <span className={`status-badge status-${dispute.status}`} style={{ marginTop: '0.5rem', display: 'inline-flex' }}>
            {dispute.status}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>${(dispute.amount / 100).toFixed(2)}</div>
          <div style={{ color: 'var(--color-text-muted)' }}>{dispute.currency.toUpperCase()}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Dispute Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Reason</div>
            <div style={{ textTransform: 'capitalize' }}>{dispute.reason?.replace(/_/g, ' ')}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Description</div>
            <div>{reasonDescriptions[dispute.reason] || 'Standard dispute'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Charge ID</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{dispute.charge_id}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Created</div>
            <div>{new Date(dispute.created_at).toLocaleDateString()}</div>
          </div>
          {dispute.evidence_deadline && (
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Evidence Deadline</div>
              <div style={{ color: 'var(--color-warning)' }}>
                {new Date(dispute.evidence_deadline).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {dispute.payment_method_details && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Payment Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {dispute.payment_method_details.card && (
              <>
                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Card Brand</div>
                  <div style={{ textTransform: 'capitalize' }}>{dispute.payment_method_details.card.brand}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Last 4</div>
                  <div>•••• {dispute.payment_method_details.card.last4}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Evidence & Responses</h3>
          <Link href={`/disputes/${id}/generate`} className="btn btn-primary">
            Generate AI Response
          </Link>
        </div>
        
        {!evidence?.length ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            No responses generated yet. Click "Generate AI Response" to create one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {evidence.map(ev => (
              <div key={ev.id} style={{ 
                padding: '1rem', 
                background: 'var(--color-bg-tertiary)', 
                borderRadius: '8px',
                border: ev.submitted_to_stripe ? '1px solid var(--color-success)' : '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                  {ev.submitted_to_stripe && (
                    <span style={{ color: 'var(--color-success)', fontSize: '0.875rem' }}>✓ Submitted to Stripe</span>
                  )}
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{ev.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}