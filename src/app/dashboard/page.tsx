import { redirect } from 'next/navigation'
import { createServerClientWithCookies } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function Dashboard() {
  const supabase = await createServerClientWithCookies()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has connected Stripe account
  const { data: stripeAccount } = await supabase
    .from('stripe_accounts')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!stripeAccount) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1>Connect Your Stripe Account</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
          To view your disputes, first connect your Stripe account.
        </p>
        <Link href="/api/stripe/connect" className="btn btn-primary">
          Connect Stripe
        </Link>
      </div>
    )
  }

  // Fetch disputes from Stripe
  const { data: disputes } = await supabase
    .from('disputes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const openDisputes = disputes?.filter(d => d.status === 'needs_response') || []
  const wonDisputes = disputes?.filter(d => d.status === 'won') || []
  const lostDisputes = disputes?.filter(d => d.status === 'lost') || []

  const totalDisputed = disputes?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0
  const winRate = disputes?.length ? Math.round((wonDisputes.length / disputes.length) * 100) : 0

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard</h1>
        <a href="/api/stripe/connect" className="btn btn-secondary">Reconnect Stripe</a>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-value">{openDisputes.length}</div>
          <div className="stat-label">Open Disputes</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">${(totalDisputed / 100).toFixed(2)}</div>
          <div className="stat-label">Total Disputed</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{winRate}%</div>
          <div className="stat-label">Win Rate</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{wonDisputes.length}/{disputes?.length || 0}</div>
          <div className="stat-label">Won/Lost</div>
        </div>
      </div>

      <h2 style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>Recent Disputes</h2>
      
      {!disputes?.length ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No disputes found. You're all clear!</p>
        </div>
      ) : (
        <div className="disputes-list">
          {disputes.map((dispute) => (
            <Link href={`/disputes/${dispute.id}`} key={dispute.id} className="dispute-row card">
              <div className="dispute-info">
                <span className={`status-badge status-${dispute.status}`}>
                  {dispute.status}
                </span>
                <span className="dispute-reason">{dispute.reason}</span>
              </div>
              <div className="dispute-meta">
                <span className="dispute-amount">${(dispute.amount / 100).toFixed(2)}</span>
                <span className="dispute-date">
                  {new Date(dispute.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}